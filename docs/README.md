# FindMyHouse 文档索引

FindMyHouse 是一个面向租房决策的个人数据整理与智能分析工具。项目目标是帮助用户集中管理房源信息，在地图上理解位置、通勤、预算与生活便利性，并结合 Agent 对房源进行分析、对比和推荐。

## 文档目录

- [阶段 0 验收清单](./stage-0-checklist.md)：项目启动、仓库基础、设计文档和进入阶段 1 的检查项。
- [项目总体设计](./project-overview.md)：产品定位、目标用户、核心场景、设计原则。
- [系统架构设计](./architecture.md)：Vue、Node.js、SQLite、地图服务与 Agent 的整体技术架构。
- [功能模块规划](./feature-modules.md)：房源管理、地图视图、通勤分析、对比决策、Agent 推荐等模块拆解。
- [数据模型设计](./data-model.md)：核心实体、SQLite 表结构建议与数据流。
- [Agent 设计方案](./agent-design.md)：Agent 能力边界、工具调用、推荐逻辑与安全策略。
- [项目 Roadmap](./roadmap.md)：阶段性开发迭代计划与里程碑。

## 推荐技术栈

- 前端：Vue 3、TypeScript、Vite、Pinia、Vue Router
- 后端：Node.js、TypeScript、Fastify 或 Express
- 数据库：SQLite，开发期可使用 better-sqlite3 或 Prisma
- 地图：Mapbox、Google Maps、Amap 或 Leaflet + 第三方瓦片服务
- Agent：OpenAI API 或兼容 LLM Provider，后端封装 Agent Service

## 当前阶段

当前处于阶段 0：项目启动与基础设计。阶段 0 的文档和仓库基础用于支撑阶段 1 的工程骨架初始化，不包含前后端运行时代码。
