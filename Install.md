# FindMyHouse 部署指南（Agent 专用）

本文档面向部署 Agent，提供从零开始部署 FindMyHouse 项目的完整步骤。

## 前置条件

- macOS / Linux / Windows 均可
- 需要联网（安装依赖、加载高德地图 SDK、调用 LLM）

## 步骤 1：安装 Node.js

项目使用 npm workspaces + `tsx` + `vite`。需要 Node.js >= 18。

### macOS

```bash
# 使用 Homebrew
brew install node

# 或者使用 nvm（推荐）
brew install nvm
nvm install 22
nvm use 22
```

### Linux (Ubuntu/Debian)

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Windows

从 https://nodejs.org/ 下载 LTS 版本安装，或使用 winget：

```powershell
winget install OpenJS.NodeJS.LTS
```

安装完成后验证：

```bash
node -v   # 应 >= 18
npm -v    # 应 >= 9
```

## 步骤 2：拉取代码

```bash
git clone https://github.com/wilson-lyc/FindMyHouse.git
cd FindMyHouse
```

## 步骤 3：配置环境变量

项目根目录的 `.env` 文件控制后端端口、数据库路径和前端的端口。如果不存在，手动创建：

```bash
cat > .env << 'EOF'
PORT=3001
HOST=0.0.0.0
DATABASE_URL=./data/find-my-house.sqlite
VITE_PORT=5173
EOF
```

**默认值已可直接使用，通常无需修改**。API Key 等敏感配置通过运行时的 Web UI 或 API 写入 SQLite 数据库，不在 `.env` 中存储。

## 步骤 4：安装依赖

```bash
npm install
```

这会自动安装根目录、`apps/backend/` 和 `apps/frontend/` 的所有依赖（npm workspaces）。

## 步骤 5：启动项目

```bash
npm run dev
```

这会同时启动：
- 后端服务（Fastify 5）：`http://localhost:3001`
- 前端服务（Vite + Vue 3）：`http://localhost:5173`

首次启动时，后端会自动执行数据库迁移（创建 SQLite 数据库和表），前端会显示欢迎向导页面。

## 步骤 6：配置 API Key

项目依赖以下外部服务，需要获取并配置对应的 Key。可以通过以下两种方式之一完成：

### 方式 A：通过 Web UI 配置（推荐）

1. 打开浏览器访问 `http://localhost:5173`
2. 首次访问会出现欢迎向导页面，按提示填写即可
3. 如需修改，访问 `http://localhost:5173` 进入「设置」页面

### 方式 B：通过后端 API 配置

```bash
curl -X POST http://localhost:3001/api/config \
  -H "Content-Type: application/json" \
  -d '{
    "openaiBaseUrl": "https://api.deepseek.com/v1",
    "openaiApiKey": "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "openaiModel": "deepseek-v4-flash",
    "openaiTemperature": 0,
    "amapWebServiceKey": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "viteAmapJsKey": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "viteAmapSecurityJsCode": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  }'
```

### 需要获取的 Key

#### 1. 高德地图（AMap）— 3 个 Key

前往 [高德开放平台](https://lbs.amap.com/) 注册账号并创建应用。

| 配置项 | 说明 | 获取位置 |
|--------|------|----------|
| `AMAP_WEB_SERVICE_KEY` | Web Service Key，后端用于地理编码/逆地理编码/通勤距离计算 | 高德控制台 → 应用管理 → 创建应用 → 添加 Key，选择「Web 服务」类型 |
| `VITE_AMAP_JS_KEY` | JS API Key，前端用于加载地图 SDK | 高德控制台 → 同一应用 → 添加 Key，选择「Web端(JS API)」类型 |
| `VITE_AMAP_SECURITY_JS_CODE` | 安全密钥，前端地图 SDK 安全认证 | 高德控制台 → 同一应用的 JS API Key → 查看「安全密钥」 |

**高德 Key 配置要点：**
- 需要创建两个 Key（一个 Web 服务类型，一个 Web端 JS API 类型），或在同一个应用下添加两个 Key
- JS API Key 需要配置「域名白名单」为 `localhost` 和你的部署域名
- 安全密钥（Security JS Code）绑定在 JS API Key 上，在 Key 详情页查看
- Key 通常需要 10-30 分钟生效

#### 2. LLM（OpenAI 兼容接口）— 最多 4 个配置项

项目使用 LangChain + OpenAI 兼容接口调用大语言模型。默认模型为 `deepseek-v4-flash`。

| 配置项 | 说明 | 示例值 |
|--------|------|--------|
| `OPENAI_BASE_URL` | API 地址（必填） | `https://api.deepseek.com/v1` |
| `OPENAI_API_KEY` | API Key（必填） | `sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` |
| `OPENAI_MODEL` | 模型名称（可选，默认 `deepseek-v4-flash`） | `deepseek-v4-flash` |
| `OPENAI_TEMPERATURE` | 温度参数（可选，默认 `0`） | `0` |

**支持的 LLM 服务商（示例）：**
- DeepSeek：`https://api.deepseek.com/v1`
- OpenAI：`https://api.openai.com/v1`
- 硅基流动：`https://api.siliconflow.cn/v1`
- 任何兼容 OpenAI API 格式的服务商

**获取方式：**
- 前往对应服务商官网注册账号
- 在 API 管理页面创建 API Key
- 记录 Base URL 和 API Key

## 验证部署

1. 确认后端启动成功：终端日志显示 `Server listening at http://[::]:3001`
2. 确认前端启动成功：终端日志显示 `http://localhost:5173`
3. 打开 `http://localhost:5173` 确认页面正常加载
4. 检查健康接口：`curl http://localhost:3001/api/health`

## 常见问题

### 数据库文件在哪？

默认位置是 `apps/backend/data/find-my-house.sqlite`（相对于项目根目录为 `apps/backend/data/find-my-house.sqlite`），由 `.env` 中的 `DATABASE_URL` 控制。

### 如何重置数据库？

删除 SQLite 数据库文件，重启后端：

```bash
rm -f ./data/find-my-house.sqlite
npm run dev
```

后端会自动重新创建数据库和表。

### 端口被占用？

修改 `.env`：
- `PORT=3002`（后端）
- `VITE_PORT=5174`（前端）
