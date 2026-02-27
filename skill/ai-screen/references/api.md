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
      "created_at": 1234567890,
      "updated_at": 1234567890
    }
  ]
}
```

### POST /api/screens/:id/confirm

确认注册 pending 状态的屏幕。

**请求体：**
```json
{
  "name_en": "Screen Name",
  "name_zh": "屏幕名称"
}
```

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

编辑屏幕信息（仅 name_en 和 name_zh）。

**请求体：**
```json
{
  "name_en": "New Name",
  "name_zh": "新名称"
}
```

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

**连接地址：** `ws://host/ws?token={screen_token}`

**消息格式：**

```json
// 投影消息
{
  "type": "project",
  "data": {
    "project_type": "inline_html|iframe",
    "content": "...",
    "attachment_url": "..."
  }
}

// 注册成功消息
{
  "type": "registered",
  "data": {
    "name_en": "...",
    "name_zh": "..."
  }
}
```

## 占位符替换

在投影内容中，以下占位符会被屏幕端自动替换：

- `$screen_token` → 屏幕的实际访问 token

这在附件 URL 需要屏幕 token 进行访问控制时非常有用。
