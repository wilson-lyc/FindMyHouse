# FindMyHouse

FindMyHouse 是一个面向租房决策的个人房源整理与智能分析工具。它帮助用户把不同渠道的房源信息结构化，在地图、通勤、预算、生活便利性和 Agent 分析的辅助下完成筛选、对比和最终决策。

## 当前阶段

当前处于 Roadmap 阶段 0：项目启动与基础设计。

阶段 0 已完成的基础内容：

- Git 仓库已初始化。
- 当前开发分支为 `dev`。
- 项目文档目录已建立。
- 总体设计、系统架构、功能模块、数据模型、Agent 方案和 Roadmap 已形成初版。
- 阶段 0 验收清单已补充，便于进入工程初始化阶段前检查。

下一阶段是阶段 1：工程骨架与基础数据，目标是搭建可运行的 Vue 3 + TypeScript + Vite 前端、Node.js + TypeScript 后端、SQLite 数据库和基础房源 CRUD。

## 文档入口

- [文档索引](./docs/README.md)
- [项目总体设计](./docs/project-overview.md)
- [系统架构设计](./docs/architecture.md)
- [功能模块规划](./docs/feature-modules.md)
- [数据模型设计](./docs/data-model.md)
- [Agent 设计方案](./docs/agent-design.md)
- [项目 Roadmap](./docs/roadmap.md)
- [阶段 0 验收清单](./docs/stage-0-checklist.md)

## 推荐技术栈

- 前端：Vue 3、TypeScript、Vite、Pinia、Vue Router
- 后端：Node.js、TypeScript、Fastify
- 数据库：SQLite，迁移工具优先考虑 Prisma Migrate 或 Drizzle Kit
- 地图：由后端封装 Mapbox、Google Maps、Amap 或 Leaflet 相关服务能力
- Agent：后端封装 OpenAI API 或兼容 LLM Provider

## MVP 边界

MVP 优先完成：

1. 房源 CRUD 与基础数据持久化。
2. 关键地点管理。
3. 地图点位展示。
4. 通勤计算与缓存。
5. 基础筛选、排序、标签和对比。
6. Agent 单房源摘要、风险提示、看房问题清单和推荐解释。

暂不纳入 MVP 首批工程目标：

- 自动网页解析。
- 浏览器剪藏插件。
- OCR。
- 多人协作。
- 高级 Agent 记忆与主动提醒。
- 移动 App。

## 后续工程初始化建议

阶段 1 开始时建议先完成：

1. 创建前端和后端目录结构。
2. 统一 TypeScript、lint、format 和开发脚本。
3. 选定后端框架，默认推荐 Fastify。
4. 选定 SQLite 访问与迁移方案。
5. 先实现 `listings` 表、房源 CRUD API 和前端房源列表/表单。
