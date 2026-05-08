# FindMyHouse

FindMyHouse 是一个面向租房决策的个人房源整理与智能分析工具。它帮助用户把不同渠道的房源信息结构化，在地图、通勤、预算、生活便利性和 Agent 分析的辅助下完成筛选、对比和最终决策。

## 当前阶段

当前正在推进 Roadmap 阶段 2：双模式地图工作台。

已完成的基础内容：

- Git 仓库已初始化。
- 当前开发分支为 `dev`。
- 项目文档目录已建立。
- 总体设计、系统架构、功能模块、数据模型、Agent 方案和 Roadmap 已形成初版。
- 阶段 0 验收清单已补充，便于进入工程初始化阶段前检查。
- Vue 3 + TypeScript + Vite 前端已初始化。
- Node.js + TypeScript + Fastify 后端已初始化。
- SQLite 持久化已接入，当前使用 `better-sqlite3`。
- 房源 CRUD API 已实现。
- 前端房源列表、筛选、创建、编辑和删除已实现。
- 关键地点 CRUD API 已实现。
- 已接入高德地理编码接口和前端高德 JS SDK 加载。
- 前端已支持关键地点管理、地图点位展示、房源点位点击摘要和地图视野筛选。
- 阶段 2 的界面方向已调整为双模式地图工作台：列表模式保留高密度管理效率，大屏地图模式强化空间关系判断。
- 大屏地图模式已具备房源列表、筛选、地点、详情和分析统计浮动面板。
- 房源详情/编辑弹窗已按基础、位置、租金费用、联系方式分区，并提供顶部等分跳转导航。
- 房源详情/编辑弹窗内嵌高德地图点选坐标，地图容器已做层级隔离，避免第三方地图控件覆盖自有 UI。

## 文档入口

- [文档索引](./docs/README.md)
- [项目总体设计](./docs/project-overview.md)
- [系统架构设计](./docs/architecture.md)
- [功能模块规划](./docs/feature-modules.md)
- [数据模型设计](./docs/data-model.md)
- [Agent 设计方案](./docs/agent-design.md)
- [项目 Roadmap](./docs/roadmap.md)

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

本地开发：

```bash
npm install
cp .env.example .env
npm run dev
```

高德地图相关变量放在本地 `.env` 中：

```bash
AMAP_WEB_SERVICE_KEY=your-amap-web-service-key
VITE_AMAP_JS_KEY=your-amap-js-api-key
VITE_AMAP_SECURITY_JS_CODE=
```

`.env` 已被 `.gitignore` 排除，不应提交真实 Key。

默认端口：

- 前端：`http://localhost:5173`
- 后端：`http://localhost:3001`

常用命令：

```bash
npm run typecheck
npm run build
npm run start
```

## 工程结构

```text
backend/src/
  app/                 Fastify 应用组装和全局错误处理
  config/              环境变量与运行配置
  database/            SQLite 连接和迁移初始化
  routes/              跨业务模块的基础路由
  modules/houses/    房源模块，包含 domain、dto、mapper、repository、service、routes
  modules/locations/   关键地点模块，包含 domain、dto、mapper、repository、service、routes
  modules/maps/        地图服务模块，封装高德地理编码能力

frontend/src/
  app/                 前端应用入口组件
  shared/              跨功能复用的 API 基础设施和工具函数
  features/houses/   房源业务功能，包含 api、components、composables、lib、model、pages
  features/locations/  关键地点管理
  features/maps/       高德地图组件、SDK 加载和地理编码 API
```
