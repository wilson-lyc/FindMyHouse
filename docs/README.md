# FindMyHouse 文档索引

FindMyHouse 是一个面向租房决策的个人数据整理与智能分析工具。项目目标是帮助用户集中管理房源信息，在地图上理解位置、通勤、预算与生活便利性，并结合 Agent 对房源进行分析、对比和推荐。

## 文档目录

- [项目总体设计](./project-overview.md)：产品定位、目标用户、核心场景、设计原则。
- [系统架构设计](./architecture.md)：Vue、Node.js、SQLite、地图服务与 Agent 的整体技术架构。
- [功能模块规划](./feature-modules.md)：房源管理、地图视图、通勤分析、对比决策、Agent 推荐等模块拆解。
- [双模式地图工作台设计](./map-workbench-design.md)：阶段 2 的列表模式、大屏地图模式、浮动面板和点位联动设计。
- [数据模型设计](./data-model.md)：核心实体、SQLite 表结构建议与数据流。
- [Agent 设计方案](./agent-design.md)：Agent 能力边界、工具调用、推荐逻辑与安全策略。
- [项目 Roadmap](./roadmap.md)：阶段性开发迭代计划与里程碑。

## 当前进展

当前推进到 Roadmap 阶段 2：双模式地图工作台。

已完成：

- 阶段 1 的前后端工程骨架、SQLite 持久化和房源 CRUD。
- 关键地点 CRUD API。
- 高德地图 Web 服务地理编码接口。
- 前端高德 JS SDK 加载。
- 房源和关键地点的地图点位展示基础。
- 地图视野筛选列表的基础能力。

当前设计决策：

- 阶段 2 的主界面支持列表模式和大屏地图模式。
- 列表模式保留列表为主、地图为小窗的当前效率工作台。
- 大屏地图模式将房源列表、筛选器、关键地点、详情和分析统计以浮动面板方式叠加在地图上。
- 后续通勤路线、对比和 Agent 分析都围绕双模式工作台扩展。

## 推荐技术栈

- 前端：Vue 3、TypeScript、Vite、Pinia、Vue Router
- 后端：Node.js、TypeScript、Fastify 或 Express
- 数据库：SQLite，开发期可使用 better-sqlite3 或 Prisma
- 地图：Mapbox、Google Maps、Amap 或 Leaflet + 第三方瓦片服务
- Agent：OpenAI API 或兼容 LLM Provider，后端封装 Agent Service
