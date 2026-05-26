# ChatMessageItem 组件提取计划

## 目标

将 ChatPanel.vue 中渲染单条聊天消息的模板、逻辑和样式提取为独立的 `ChatMessageItem.vue` 组件，消除主消息列表与分享截图区域中重复的消息模板代码。

> **注意**：房源卡片列表已预封装为 `ChatHouseCard.vue`，ChatMessageItem 将直接使用该组件。

---

## 现状分析

### 重复的模板代码

ChatPanel.vue 中有**两处**几乎完全相同的消息渲染逻辑：

1. **主线消息列表**（L739-814）：完整的交互式消息气泡，含可点击的房源卡片、可选的选择提示、可用的对比按钮。
2. **分享截图渲染**（L924-976）：完全相同的结构，但是所有按钮 `disabled`，房源卡片不可点击。

两处合计约 **130 行**重复模板代码。

### 依赖关系

ChatMessageItem 组件需要的依赖：
| 依赖 | 来源 | 用途 |
|------|------|------|
| `MarkdownIt` | `markdown-it` | 渲染 AI 消息 Markdown |
| `House` | `../../model/house/house` | 类型定义 |
| `ChatHouseCard` | `./ChatHouseCard.vue` | 房源卡片列表（已封装） |
| `github-markdown-css` | 已在 `main.ts` 全局导入 | `.markdown-body` 样式 |

**不再需要的依赖（已由 ChatHouseCard 处理）：** `statusLabels`、`formatCurrency`

### CSS 范围

所有消息相关样式均位于 ChatPanel.vue 的 `<style scoped>` 中（L1265-1587）。迁移规划：

| 移入 ChatMessageItem | ChatPanel 保留 |
|---|---|
| `.chat-message-wrapper` + `.user` / `.assistant` 变体 | `.chat-message-wrapper`（基础样式，用于独立加载指示器 L816） |
| `.chat-bubble` + 角色变体 | `.chat-bubble`（基础样式，用于独立加载指示器 L817） |
| `.chat-bubble-text` | `.chat-message-wrapper.assistant .chat-bubble`（用于独立加载指示器） |
| `.chat-bubble-markdown` + `:deep` | `.chat-loading` |
| `.chat-choice-prompt` 全系列（L1338-L1444） | `.chat-loading-dot` + `@keyframes chat-bounce` |
| `.chat-house-results` / `.chat-house-results-header` | |
| `.chat-compare-actions` + `.el-button` | |
| `.chat-inline-loading` | |

> `.chat-house-*` 卡片相关样式（`.chat-house-card`, `.chat-house-name`, `.chat-house-price` 等）无需迁移——房源列表改用 ChatHouseCard，它自带独立样式。

---

## 实施步骤

### 步骤 1：新建 `frontend/src/components/chat/ChatMessageItem.vue`

**Script 部分：**
- Props：
  - `message: ChatMessage` — 消息数据
  - `loading: boolean` — 当前是否正在加载
  - `customChoiceInputs: Record<string, string>` — 选择提示自定义输入值
  - `disabled?: boolean` — 分享模式标记（默认 `false`）
- Emits：`selectHouse(house: House)`、`openHouseCompare(houses: House[])`、`submitChoiceAnswer(value: string)`、`submitCustomChoiceAnswer()`
- 导入：`MarkdownIt`、`House`、`ChatHouseCard`
- 初始化 MarkdownIt 实例（配置同 ChatPanel + 表格包装规则）
- 复制辅助方法：`renderAssistantContent`、`getVisibleAssistantContent`、`normalizeChoiceText`

**Template 部分（从 ChatPanel.vue L739-814 复制并调整）：**
```
.chat-message-wrapper[.user | .assistant]
  .chat-bubble
    ── 如果是 assistant ──
      .chat-bubble-markdown.markdown-body (v-html，条件渲染)
      .chat-choice-prompt（条件渲染：问题 → 选项按钮 → 自定义输入表单）
      .chat-inline-loading（条件渲染：无内容且无选择提示时，3 个圆点）
    ── 如果是 user ──
      .chat-bubble-text（纯文本）
    ── 房源列表（条件渲染）──
      .chat-house-results-header: "找到 N 套房源"
      ChatHouseCard（v-for，传入 :house / :disabled，监听 @select）
    ── 对比操作（条件渲染）──
      .chat-compare-actions > el-button "打开对比表"
```

调整项目：
- `msg` → `message`（prop 名称）
- 房源卡片替换为 `ChatHouseCard`：
  ```html
  <ChatHouseCard
    v-for="house in message.houses"
    :key="house.id"
    :house="house"
    :disabled="disabled"
    @select="(h) => $emit('selectHouse', h)"
  />
  ```
- `handleSelectHouse(house)` → `$emit('selectHouse', house)`
- `handleOpenHouseCompare(...)` → `$emit('openHouseCompare', ...)`
- `submitChoiceAnswer(msg, option.value)` → `$emit('submitChoiceAnswer', option.value)`
- `submitCustomChoiceAnswer(msg)` → `$emit('submitCustomChoiceAnswer')`
- 选择提示按钮增加 `disabled || Boolean(message.choicePrompt.answeredValue) || disabled` 判断
- 自定义输入 `v-model` → `modelValue` + `@update:modelValue`（改用 `customChoiceInputs[message.choicePrompt.id]` 作为 prop）

**Style 部分（scoped）——从 ChatPanel.vue 迁移以下块：**
| CSS 块 | 行号范围 |
|--------|----------|
| `.chat-message-wrapper` + `.user` / `.assistant` | L1265-L1280 |
| `.chat-bubble` + 角色变体 | L1282-L1307 |
| `.chat-bubble-text` | L1293-L1295 |
| `.chat-bubble-markdown` + `:deep` | L1309-L1336 |
| `.chat-choice-prompt` 全系列 | L1338-L1444 |
| `.chat-inline-loading` | L1446-L1453 |
| `.chat-house-results` / `.chat-house-results-header` | L1489-L1510 |
| `.chat-compare-actions` + `.el-button` | L1495-L1503 |

---

### 步骤 2：更新 ChatPanel.vue

**Script 改动：**
- 新增导入：`ChatMessageItem`（从 `./ChatMessageItem.vue`）
- 移除导入：`MarkdownIt`（移至 ChatMessageItem）
- 移除方法：`renderAssistantContent`、`getVisibleAssistantContent`、`normalizeChoiceText`
- 移除常量：`markdown`（MarkdownIt 实例）
- 移除导入：`statusLabels`、`formatCurrency`（仅用于消息模板中的房源卡片，已由 ChatHouseCard 处理）

**Template 改动：**

主线消息列表（L739-815）替换为：
```html
<ChatMessageItem
  v-for="(msg, index) in visibleMessages"
  :key="index"
  :message="msg"
  :loading="loading"
  :custom-choice-inputs="customChoiceInputs"
  @select-house="handleSelectHouse"
  @open-house-compare="handleOpenHouseCompare"
  @submit-choice-answer="(value) => submitChoiceAnswer(msg, value)"
  @submit-custom-choice-answer="submitCustomChoiceAnswer(msg)"
/>
```

分享截图消息列表（L924-976）替换为：
```html
<ChatMessageItem
  v-for="(msg, index) in shareRenderMessages"
  :key="index"
  :message="msg"
  :loading="loading"
  :custom-choice-inputs="customChoiceInputs"
  disabled
/>
```

**Style 改动：**
- 移除已迁移的 CSS 块（见上表）
- 保留用于独立加载指示器（L816-822）的 CSS：
  - `.chat-message-wrapper`（L1265-L1268）
  - `.chat-message-wrapper.assistant`（L1276-L1280）
  - `.chat-bubble`（L1282-L1291）
  - `.chat-message-wrapper.assistant .chat-bubble`（L1303-L1307）
  - `.chat-loading`（L1455-L1460）
  - `.chat-loading-dot` + `@keyframes chat-bounce`（L1462-L1487）
- 移除旧的 `.chat-house-card` 系列样式（L1512-L1587，不再使用）

---

## 验证清单

1. ✅ 主消息列表和分享截图渲染使用同一 ChatMessageItem 组件，无重复模板
2. ✅ 房源卡片通过 ChatHouseCard 渲染，视觉一致
3. ✅ 所有交互正常：
   - 选择提示单选 / 自定义输入 → 发送
   - 房源卡片点击 → 查看详情
   - 对比按钮 → 打开对比表
   - 分享截图渲染（禁用模式无交互）
4. ✅ 无 TypeScript 编译错误
5. ✅ 无运行时错误
