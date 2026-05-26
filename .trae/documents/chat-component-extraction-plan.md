# 对话模块组件提取计划

## 目标

将 ChatPanel.vue 中的多个内联 UI 块和逻辑提取为独立的组件/composable，消除重复代码，提升可维护性和复用性。

## 现有组件体系

```
ChatPanel.vue (主容器，~1283 行)
  ├── ChatMessageItem.vue     ← 单条消息气泡
  │     ├── ChatHouseCard.vue     ← 房源卡片 (已封装)
  │     └── ChatChoicePrompt.vue  ← 单选题 + 自定义输入 (已封装)
  │
  ├── [内联] ChatComposer     ← 消息输入区 (textarea + 发送按钮)
  ├── [内联] 三点加载动画      ← ChatLoading 原子组件
  ├── [内联] ChatSessionDialog  ← 会话管理弹窗 (el-dialog)
  ├── [内联] ChatShareDialog    ← 分享图生成弹窗 (el-dialog)
  └── [内联] ChatCompareConfirm ← 对比确认弹窗 (el-dialog + Promise通信)
```

***

## Phase 0 — 提取 ChatMessage 类型

### 动机

`ChatMessage` 接口在 ChatPanel.vue 和 ChatMessageItem.vue 中**各自定义了一遍**，且二者字段不一致：

* ChatPanel 用 `Extract<AgentFrontendAction, { type: 'ask_single_choice' }>` 定义 `choicePrompt`

* ChatMessageItem 用简化 inline type

* `PersistedChatMessage`（chat-session-api.ts）又是另一套

### 操作

1. 新建 `frontend/src/model/chat/chat-message.ts`
2. 定义统一的 `ChatMessage` 接口
3. 更新 ChatPanel.vue 和 ChatMessageItem.vue 导入该类型，移除内联定义
4. 更新 chat-session-api.ts 中 `PersistedChatMessage` 引用\*\*（或删除独立类型，复用同一接口）\*\*

### 注意

ChatPanel 中的 `ChatMessage` 有 `compareHouses` 字段，ChatMessageItem 中也有，统一后保持一致。

***

## Phase 1 — ChatLoading.vue (P0)

### 现状

三点加载动画在**3 处**有重复 CSS + 模板：

* ChatPanel.vue L720-726（独立加载指示器）

* ChatMessageItem.vue L95-99（inline loading）

* ChatChoicePrompt.vue → 没有，但可复用

### 操作

1. 新建 `frontend/src/components/chat/ChatLoading.vue`
2. Props: `size?: 'small' | 'default'`（控制圆点大小）
3. 封装 3 个 `chat-loading-dot` + `@keyframes chat-bounce` 动画
4. ChatMessageItem.vue 中替换内联加载器为 `<ChatLoading />`
5. ChatPanel.vue 中替换独立加载指示器为 `<ChatLoading />`，移除重复 CSS

***

## Phase 2 — ChatComposer.vue (P0)

### 现状

ChatPanel.vue L730-757 是消息输入区的模板，L1198-1283 是相应 CSS，合计约 **110 行**内联代码。

### 操作

1. 新建 `frontend/src/components/chat/ChatComposer.vue`
2. Props:

   * `modelValue: string`（v-model 绑定输入值）

   * `disabled?: boolean`（加载时禁用）

   * `placeholder?: string`（默认 "用自然语言描述你想要的房子..."）
3. Emits:

   * `update:modelValue`

   * `submit`（Enter 发送/点击发送按钮时触发）
4. 内部处理 `Shift+Enter` 换行、`Enter` 提交逻辑
5. ChatPanel.vue 中替换为 `<ChatComposer v-model="inputValue" :disabled="loading" @submit="handleSubmit" />`

***

## Phase 3 — useChatSession composable (P1)

### 现状

ChatPanel.vue L123-243 包含约 **80 行**与会话管理相关的纯逻辑：加载列表、创建/更新会话、删除单条/批量。

### 操作

1. 新建 `frontend/src/composables/chat/useChatSession.ts`
2. 暴露的状态和方法：

   * `sessions: Ref<ChatSessionSummary[]>`

   * `sessionsLoading: Ref<boolean>`

   * `selectedSessionIds: Ref<string[]>`

   * `currentSessionId: Ref<string | null>`

   * `hasSelectedSessions: ComputedRef<boolean>`

   * `loadSessions()` — 加载列表

   * `createSessionTitle(content: string): string` — 截取标题

   * `persistCurrentSession(messages, titleSource?)` — 创建或更新

   * `restoreSession(id: string): Promise<ChatSession>` — 恢复

   * `removeSession(id: string)` — 删除单条

   * `removeSelectedSessions()` — 批量删除

   * `handleSessionSelectionChange(selection)` — 选中回调

   * `startNewSession()` — 重置为新建状态

***

## Phase 4 — ChatSessionDialog.vue (P1)

### 现状

ChatPanel.vue L760-808 是会话管理弹窗模板，CSS 约 60 行，逻辑约 70 行集中在 ChatPanel script 中。

### 依赖

* 依赖 `useChatSession` composable（Phase 3）

* 依赖 `ChatMessage` 类型（Phase 0）

* 需要接收 `shareGenerating` 和 `shareSession` 回调（可穿透过 emit）

### 操作

1. 新建 `frontend/src/components/chat/ChatSessionDialog.vue`
2. Props:

   * `visible: boolean`

   * `sessions`, `sessionsLoading`, `hasSelectedSessions`, `selectedSessionIds`

   * `shareGenerating?: boolean`
3. Emits:

   * `update:visible`

   * `restoreSession(id)`

   * `shareSession(id)`

   * `removeSession(id)`

   * `removeSelectedSessions(ids)`

   * `selectionChange(selection)`
4. 模板内嵌 `el-table` + 工具栏 + 操作按钮
5. ChatPanel.vue 中替换为 `<ChatSessionDialog ... />`

***

## Phase 5 — useChatShare composable (P2)

### 现状

ChatPanel.vue script 中 L525-648 约 **60 行**分享图生成逻辑（html2canvas 渲染、隐私确认、复制/下载）。

### 操作

1. 新建 `frontend/src/composables/chat/useChatShare.ts`
2. 暴露的状态和方法：

   * `shareDialogVisible: Ref<boolean>`

   * `shareImageUrl: Ref<string>`

   * `shareGenerating: Ref<boolean>`

   * `shareRenderMessages: Ref<ChatMessage[]>`

   * `canShareConversation: ComputedRef<boolean>`

   * `openShareDialog(messages)` — 启动分享流程

   * `shareSession(sessionsService, sessionId)` — 分享指定会话

   * `copyShareImage()` — 复制图片到剪贴板

   * `downloadShareImage()` — 下载 PNG
3. 内部封装 `createConversationShareImage` + `renderElementToPng`（html2canvas 细节）

***

## Phase 6 — ChatShareDialog.vue + ChatShareCapture.vue (P2)

### 现状

ChatPanel.vue L811-847 是分享弹窗模板，CSS 约 120 行。另含一个离屏渲染用的 `.chat-share-capture-host` 结构。

### 依赖

* 依赖 `ChatMessageItem` 组件

* 依赖 `useChatShare` composable（Phase 5）

* 依赖 `ChatMessage` 类型（Phase 0）

### 操作

1. 新建 `frontend/src/components/chat/ChatShareDialog.vue`
2. Props:

   * `visible: boolean`

   * `shareImageUrl`, `shareGenerating`

   * `shareRenderMessages`

   * `customChoiceInputs`

   * `loading`
3. Emits:

   * `update:visible`

   * `copyImage`

   * `downloadImage`
4. 模板：预览区 + 离屏渲染区（`.chat-share-capture-host`）+ 底部按钮
5. ChatPanel.vue 中替换为 `<ChatShareDialog ... />`

***

## Phase 7 — ChatCompareConfirmDialog.vue (P3)

### 现状

ChatPanel.vue L849-877 是对比确认弹窗，L1186-1196 是 CSS。采用 Promise 通信模式。

### 操作

1. 新建 `frontend/src/components/chat/ChatCompareConfirmDialog.vue`
2. Props:

   * `visible: boolean`

   * `houses: House[]`

   * `title?: string`
3. Emits:

   * `update:visible`

   * `confirm(houses)`

   * `cancel()`
4. ChatPanel.vue 中替换为 `<ChatCompareConfirmDialog ... />`
5. 将 Promise 通信逻辑 (`requestCompareConfirmation` / `confirmCompareHouses` / `cancelCompareHouses`) 封装在新的 composable `useCompareConfirm` 或保留在 ChatPanel

***

## Phase 8 — 更新 ChatPanel.vue (集成)

### 脚本改动

* 移除所有已提取的内联类型定义（使用 Phase 0 的共享类型）

* 移除所有已提取的内联逻辑（使用 composable）

* 导入所有新组件

* 精简后的 script 应只保留状态编排和事件转发

### 模板改动

将 5 个内联块替换为组件引用：

1. 消息区加载指示器 → `<ChatLoading />`
2. Composer → `<ChatComposer />`
3. 会话弹窗 → `<ChatSessionDialog />`
4. 分享弹窗 → `<ChatShareDialog />`
5. 对比弹窗 → `<ChatCompareConfirmDialog />`

### CSS 改动

移除已迁移到各组件的样式块，保留 ChatPanel 自身布局相关的 CSS：

* `.chat-panel` / `.chat-splitter` / `.chat-notice` / `.panel-header`

* `.chat-messages` / `.chat-empty` / `.chat-hints`

***

## 依赖关系图

```
Phase 0 (ChatMessage 类型)
  ├── Phase 3 (useChatSession composable)
  │     └── Phase 4 (ChatSessionDialog.vue)
  ├── Phase 5 (useChatShare composable)
  │     └── Phase 6 (ChatShareDialog.vue)
  ├── Phase 1 (ChatLoading.vue) ── 无依赖，随时可做
  ├── Phase 2 (ChatComposer.vue) ── 无依赖，随时可做
  └── Phase 7 (ChatCompareConfirmDialog.vue) ── 无依赖，随时可做
                                          │
                              Phase 8 ────┘ (ChatPanel 集成)
```

**建议执行顺序：** Phase 0 → Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6 → Phase 7 → Phase 8

***

## 验证清单

1. `npm run build` 通过，无 TS 编译错误
2. 消息输入：输入文字、Enter 发送、Shift+Enter 换行、加载时禁用
3. 会话管理：新建/恢复/删除单条/批量删除会话
4. 分享图：隐私确认 → 生成预览 → 复制/下载
5. 对比确认：展示房源 → 确认/取消 → Promise 正确 resolve/reject
6. 加载动画：AI 响应期间三点动画正常显示
7. 分享截图渲染（ChatMessageItem disabled 模式）：所有交互元素不可点击
8. 无运行时错误：全部功能回归正常

