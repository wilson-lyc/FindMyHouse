# 阶段 0 验收清单

## 阶段目标

阶段 0 的目标是完成项目启动与基础设计，让后续工程初始化可以基于清晰的产品方向、技术方案、模块边界和 MVP 范围展开。

## 仓库状态

- Git 仓库已初始化。
- 当前开发分支为 `dev`。
- 根目录提供 `README.md` 作为项目入口。
- 根目录提供 `.gitignore`，覆盖 Node.js、构建产物、环境变量、本地数据库和编辑器文件。
- 文档集中放在 `docs/` 目录下。

## 设计文档

阶段 0 应至少包含以下文档：

- `docs/README.md`：文档索引和推荐技术栈。
- `docs/project-overview.md`：项目定位、目标用户、核心流程和设计原则。
- `docs/architecture.md`：前后端、数据库、地图服务和 Agent 的整体架构。
- `docs/feature-modules.md`：主要功能模块和能力边界。
- `docs/data-model.md`：核心实体、表结构建议、状态枚举和数据流。
- `docs/agent-design.md`：Agent 定位、工具边界、推荐逻辑、安全与隐私策略。
- `docs/roadmap.md`：阶段性开发计划、验收标准和优先级建议。

## MVP 范围确认

MVP 优先覆盖：

- 房源手动录入、编辑、删除和列表查看。
- SQLite 持久化。
- 关键地点管理。
- 地图展示房源和关键地点。
- 通勤结果计算、保存和复用。
- 租金、面积、户型、状态、标签和通勤筛选。
- 2 到 5 套房源横向对比。
- Agent 单房源摘要、风险提示、看房问题清单和推荐解释。

MVP 暂不优先覆盖：

- 自动网页解析。
- 浏览器剪藏插件。
- 截图 OCR。
- 多人协作。
- 主动提醒。
- 移动 App。

## 阶段 1 开工条件

进入阶段 1 前，应满足：

- 技术栈已明确：Vue 3、TypeScript、Vite、Node.js、Fastify、SQLite。
- 后端分层边界已明确：API Layer、Service Layer、Repository Layer、Integration Layer。
- 核心数据实体已明确：房源、地点、通勤结果、标签、看房记录、用户偏好、Agent 分析。
- Agent 首批能力已明确：单房源摘要与风险提示、多房源推荐排序解释、看房问题清单。
- Roadmap 中阶段 1 的工程目标可以直接拆分为前后端初始化任务。
