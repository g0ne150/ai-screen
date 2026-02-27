# AI Screen - AI 屏幕中继服务

面向 AI Agent 的多屏幕中继服务，支持实时内容投影。

## 架构

```
┌─────────────┐      HTTP API + AI Token      ┌─────────────┐      WebSocket + Screen Token      ┌─────────────┐
│   AI Agent  │ ─────────────────────────────>│  中继服务   │<──────────────────────────────────>│    屏幕     │
│  (Skill/    │                               │   (Bun)     │                                    │  (浏览器)   │
│   CLI等)    │                               │             │<──────────────────────────────────>│             │
└─────────────┘                               └─────────────┘         (附件 HTTP 下载)            └─────────────┘
```

## 快速开始

### 1. 安装依赖

```bash
bun install
```

### 2. 配置

设置环境变量（或保持默认值用于测试）：

```bash
export AI_TOKEN="your-secure-ai-token-here"
export PORT=3000
```

### 3. 启动服务

```bash
bun run dev    # 开发模式（热重载）
bun start      # 生产模式
```

### 4. 访问

- 屏幕入口：`http://localhost:3000/static/index.html`
- AI Agent API: `http://localhost:3000/api/*`

## API 文档

### 认证

所有 AI Agent API 需要在 Header 中携带：
```
Authorization: Bearer {AI_TOKEN}
```

### 屏幕管理

#### 查询所有屏幕
```http
GET /api/screens
```

#### 确认注册屏幕
```http
POST /api/screens/{screen_id}/confirm
Content-Type: application/json

{
  "name_en": "Main Display",
  "name_zh": "主显示屏"
}
```

#### 编辑屏幕
```http
PATCH /api/screens/{screen_id}
Content-Type: application/json

{
  "name_en": "New Name",
  "name_zh": "新名称"
}
```

#### 失效屏幕
```http
POST /api/screens/{screen_id}/deactivate
```

#### 删除屏幕
```http
DELETE /api/screens/{screen_id}
```

### 投影

#### 投影内容到屏幕
```http
POST /api/screens/{screen_id}/project
Content-Type: application/json

{
  "type": "inline_html",
  "content": "<h1>Hello World</h1>"
}
```

或 iframe 模式：
```http
POST /api/screens/{screen_id}/project
Content-Type: application/json

{
  "type": "iframe",
  "content": "https://example.com",
  "attachment_url": "/attachments/{id}?t={token}"
}
```

**内容中的 `$screen_token` 占位符会被替换为屏幕的实际 token。**

### 附件

#### 上传附件
```http
POST /api/attachments
Content-Type: multipart/form-data

file: <binary>
```

响应：
```json
{
  "attachment": {
    "id": "...",
    "filename": "...",
    "url": "/attachments/{id}?t={token}"
  }
}
```

## 屏幕端流程

1. 打开 `http://localhost:3000/static/index.html`
2. 自动生成 screen_id，跳转到 display 页面等待注册
3. AI Agent 查询到 pending 状态的屏幕，调用确认注册接口
4. 屏幕收到注册成功消息，开始接收投影内容

## 目录结构

```
ai-screen/
├── src/
│   ├── server.ts      # 主服务器
│   ├── config.ts      # 配置
│   └── database.ts    # SQLite 数据库操作
├── static/
│   ├── index.html     # 屏幕入口（自动跳转/注册）
│   └── display.html   # 屏幕显示页面
├── attachments/       # 附件存储目录（自动创建）
├── data/              # 数据库目录（自动创建）
└── package.json
```

## 技术栈

- [Bun](https://bun.sh/) - 运行时
- [Hono](https://hono.dev/) - Web 框架
- Bun SQLite - 数据存储
- WebSocket - 实时通信
