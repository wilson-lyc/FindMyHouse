# 分享图片生成代码重新设计方案

## 设计目标

将分享图生成的捕获卡片拆分为**组件组合体**：Header / Content / Footer 各自独立，Content 复用现有 ChatMessageItem 组件，使捕获卡片的渲染逻辑清晰可维护。

## 当前架构

```
ChatShareDialog.vue (弹窗 + 捕获卡片都混在一起)
  ├── 预览区 (inline)
  ├── 离屏捕获区 (.chat-share-capture-host)
  │     └── .chat-share-capture-card (inline 模板，~120 行)
  │           ├── .chat-share-capture-header (inline，28px 标题 + slogan + el-tag)
  │           ├── ChatMessageItem (复用)
  │           └── .chat-share-capture-footer (inline，brand + slogan)
  ├── 高度计算逻辑 (querySelector 查找 footer DOM)
  └── 底部按钮 (CopyDocument + Download)
```

## 新架构

```
ChatShareDialog.vue (只负责弹窗 + 预览 + 按钮)
  ├── 预览区 (inline — 保持)
  ├── ChatShareCapture.vue (新 — 离屏捕获卡片，负责渲染 + 高度自算)
  │     ├── ChatShareHeader.vue (新 — 品牌标题 + slogan + tag)
  │     ├── ChatMessageItem (现有 — 消息列表，disabled 模式)
  │     └── ChatShareFooter.vue (新 — 品牌标语)
  └── 底部按钮 (CopyDocument + Download — 保持)
```

### 组件职责

| 组件                     | 职责                                           | Props                                       |
| ---------------------- | -------------------------------------------- | ------------------------------------------- |
| `ChatShareHeader.vue`  | 品牌标题 "FindMyHouse" + 副标题 + "对话分享" 标签         | _(无 props，纯静态)_                             |
| `ChatShareFooter.vue`  | 品牌标语                                         | _(无 props，纯静态)_                             |
| `ChatShareCapture.vue` | 组合 H+C+F + 高度计算 + 提供 `renderElementToPng` 方法 | `messages`, `customChoiceInputs`, `loading` |

## 详细步骤

### Step 1 — 创建 ChatShareHeader.vue

**路径**: `frontend/src/components/chat/ChatShareHeader.vue`

* 纯展示组件，无 props

* 模板：`.chat-share-header`（flex 容器）

  * `chat-share-header-brand` — "FindMyHouse"（28px, 800 weight）

  * `chat-share-header-slogan` — "您贴心的租房智能专家"（16px, secondary）

  * `el-tag type="primary"` — "对话分享"

* CSS 从 ChatShareDialog 迁移（padding, border-bottom, background, gap 等）

* 样式用 `scoped`，类名加 `share-` 前缀避免冲突

### Step 2 — 创建 ChatShareFooter.vue

**路径**: `frontend/src/components/chat/ChatShareFooter.vue`

* 纯展示组件

* 模板：`.chat-share-footer`（flex 容器）

  * `chat-share-footer-brand` — "FindMyHouse"（18px, 800 weight）

  * `chat-share-footer-slogan` — "您贴心的租房智能专家"（15px, secondary, text-right）

* CSS 从 ChatShareDialog 迁移（padding, border-top, min-height, gap 等）

### Step 3 — 创建 ChatShareCapture.vue

**路径**: `frontend/src/components/chat/ChatShareCapture.vue`

核心重组：将离屏捕获卡片封装为独立组件。

**Props**:

* `messages: ChatMessage[]`

* `customChoiceInputs: Record<string, string>`

* `loading: boolean`

**暴露方法**：

* `renderToPng(): Promise<string>` — 内部计算高度后调用 html2canvas

**模板结构**：

```
.chat-share-capture-card (ref="captureCardRef")
  ├── ChatShareHeader
  ├── .chat-share-messages (ref="captureMessagesRef")
  │     └── ChatMessageItem v-for messages (disabled)
  └── ChatShareFooter
```

**高度计算逻辑**（从 ChatShareDialog 的 `createConversationShareImage` 移入）：

```
async function renderToPng(): Promise<string> {
  // 1. await nextTick() x2
  // 2. await requestAnimationFrame x2
  // 3. 计算 imageWidth = max(360, card.offsetWidth)
  // 4. 计算 imageHeight = max(card.scrollHeight, card.offsetHeight, ...)
  // 5. card.style.height = imageHeight + 'px'
  // 6. 调用 renderElementToPng(card, imageWidth, imageHeight)
}
```

**CSS 迁移**：将 Capture 卡片容器样式从 ChatShareDialog 移入。`.chat-share-capture-card` 本身不需要 off-screen 定位，定位由 ChatShareDialog 的 `.chat-share-capture-host` 提供。

### Step 4 — 精简 ChatShareDialog.vue

**移除**：

1. `.chat-share-capture-header` / `.chat-share-capture-footer` 模板 → 由 ChatShareCapture 替代
2. `shareCaptureCardRef` / `shareCaptureMessagesRef` ref → 由 ChatShareCapture 内部管理
3. `createConversationShareImage()` 方法 → 由 ChatShareCapture 的 `renderToPng()` 替代
4. 所有已移出的 header/footer/card CSS

**保留**：

1. `el-dialog`（弹窗框架）
2. 预览区（`.chat-share-preview` + `<img>`）
3. 离屏容器（`.chat-share-capture-host`）
4. 底部按钮（CopyDocument + Download）

**新增**：

1. `ChatShareCapture` 的 `<template ref>`（实际挂载到的 DOM 元素）— 替换原先内联的 capture card
2. `ChatShareCapture` 的组件 ref，用于调用 `renderToPng()`

**新的生成流程**（在 ChatShareDialog 中）：

```
watch(generating) → triggerCapture()
  → 获取 ChatShareCapture 组件实例
  → 调用 captureRef.renderToPng()
  → emit('update:imageUrl', url)
  → finally: emit('update:generating', false)
```

## 依赖关系

```
Step 1 (ChatShareHeader.vue) — 无依赖
Step 2 (ChatShareFooter.vue) — 无依赖
Step 3 (ChatShareCapture.vue) — 依赖 Step 1 + Step 2 + ChatMessageItem
Step 4 (ChatShareDialog.vue) — 依赖 Step 3
```

执行顺序：Step 1 → Step 2 → Step 3 → Step 4

## 验证清单

1. `npm run build` 通过，无 TS 错误
2. 分享图生成：点击分享按钮 → 隐私确认 → 弹窗出现 → 图片渲染 → 预览展示
3. 分享图内容：Header 品牌正确 + 消息列表完整 + Footer 品牌正确
4. 复制图片 / 下载图片按钮在生成成功后可用
5. 从会话管理弹窗分享单条会话仍正常工作
6. 关闭分享弹窗后 shareGenerating 正确重置
7. 分享图生成失败时错误提示正确，弹窗关闭

