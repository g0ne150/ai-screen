# AI Screen API 完整参考

## 基础信息

- 基础 URL: 由 `AI_SCREEN_URL` 环境变量指定
- 认证方式: HTTP Header `Authorization: Bearer {AI_SCREEN_TOKEN}`

## 屏幕管理 API

### GET /api/screens

查询所有屏幕（包括 pending、active、inactive 状态）。

**响应：**
```json
{
  "screens": [
    {
      "id": "screen_xxx",
      "name_en": "Living Room",
      "name_zh": "客厅",
      "status": "active",
      "width": 1920,
      "height": 1080,
      "created_at": 1234567890,
      "updated_at": 1234567890
    }
  ]
}
```

**字段说明：**
- `width`, `height`: 屏幕物理尺寸（像素），屏幕连接时自动上报

### POST /api/screens/:id/confirm

确认注册 pending 状态的屏幕。

**请求体：**
```json
{
  "name_en": "Screen Name",
  "name_zh": "屏幕名称",
  "width": 1920,
  "height": 1080
}
```

**字段说明：**
- `name_en`, `name_zh`: 必填，屏幕名称
- `width`, `height`: 可选，覆盖屏幕自动上报的尺寸

**响应：**
```json
{
  "screen": {
    "id": "screen_xxx",
    "name_en": "Screen Name",
    "name_zh": "屏幕名称",
    "status": "active",
    ...
  }
}
```

### PATCH /api/screens/:id

编辑屏幕信息。

**请求体：**
```json
{
  "name_en": "New Name",
  "name_zh": "新名称",
  "width": 1920,
  "height": 1080
}
```

**字段说明：**
- `name_en`, `name_zh`: 可选，屏幕名称
- `width`, `height`: 可选，手动设置屏幕尺寸

### POST /api/screens/:id/deactivate

失效屏幕（token 失效，断开 WebSocket 连接）。

### DELETE /api/screens/:id

删除屏幕记录。

## 投影 API

### POST /api/screens/:id/project

向屏幕投影内容。

**请求体：**
```json
{
  "type": "inline_html|iframe",
  "content": "html content or url",
  "attachment_url": "/attachments/xxx?t=token"  // 可选
}
```

**字段说明：**
- `type`: 投影类型
  - `inline_html`: 直接注入 HTML 到屏幕页面
  - `iframe`: 在 iframe 中加载指定 URL
- `content`: 内容（inline_html 时为 HTML 字符串，iframe 时为 URL）
- `attachment_url`: 可选，iframe 模式下用于加载上传的附件

## 附件 API

### POST /api/attachments

上传附件文件。

**请求：**
- Content-Type: `multipart/form-data`
- 字段名: `file`

**响应：**
```json
{
  "attachment": {
    "id": "uuid",
    "filename": "file.pdf",
    "mime_type": "application/pdf",
    "size": 12345,
    "token": "access_token",
    "url": "/attachments/uuid?t=access_token",
    "created_at": 1234567890
  }
}
```

### GET /attachments/:id?t=:token

访问附件文件（屏幕端使用，需要附件 token）。

## WebSocket 协议

屏幕端通过 WebSocket 连接实时接收投影内容。

**连接地址：** `ws://host/ws?token={screen_token}&w={width}&h={height}`

**连接参数：**
- `token`: 屏幕 token 或 `pending`（新屏幕注册）
- `screen_id`: 新屏幕注册时提供
- `w`, `h`: 屏幕宽度和高度（像素），屏幕连接时自动上报

**消息格式：**

```json
// 连接成功消息（pending 状态）
{
  "type": "connected",
  "data": {
    "screen_id": "screen_xxx",
    "status": "pending",
    "width": 1920,
    "height": 1080,
    "message": "Waiting for AI agent confirmation"
  }
}

// 连接成功消息（active 状态）
{
  "type": "connected",
  "data": {
    "screen_id": "screen_xxx",
    "name_en": "Living Room",
    "name_zh": "客厅",
    "width": 1920,
    "height": 1080
  }
}

// 注册成功消息
{
  "type": "registered",
  "data": {
    "name_en": "...",
    "name_zh": "...",
    "token": "screen_token",
    "width": 1920,
    "height": 1080
  }
}

// 投影消息
{
  "type": "project",
  "data": {
    "project_type": "inline_html|iframe",
    "content": "...",
    "attachment_url": "..."
  }
}
```

## 占位符替换

在投影内容中，以下占位符会被屏幕端自动替换：

- `$screen_token` → 屏幕的实际访问 token

这在附件 URL 需要屏幕 token 进行访问控制时非常有用。
