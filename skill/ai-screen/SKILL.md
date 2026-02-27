---
name: ai-screen
description: |
  AI Screen 屏幕中继服务控制技能。用于发现、注册、管理屏幕设备，并向屏幕投影内容。

  使用场景：
  1. 用户说"在某某屏幕上显示什么内容"时
  2. 需要查询可用屏幕列表时
  3. 需要确认新屏幕注册时
  4. 需要向屏幕投影 HTML 或 iframe 内容时
  5. 需要上传附件（图片、PDF、HTML等）并在屏幕显示时
  6. 需要管理屏幕（编辑名称、失效、删除）时

  必须配置 AI_SCREEN_URL 和 AI_SCREEN_TOKEN 环境变量才能使用。
---

# AI Screen Skill

AI Screen 是一个屏幕中继服务，允许多个浏览器屏幕通过 WebSocket 连接到中继服务，AI agent 可以通过 HTTP API 向这些屏幕实时投影内容。

## 前置要求

使用此 skill 前，必须设置以下环境变量：

```bash
export AI_SCREEN_URL="http://localhost:3000"  # 中继服务地址
export AI_SCREEN_TOKEN="your-ai-token"         # AI agent 访问令牌
```

## 工作流程

### 1. 发现屏幕

查询所有已注册和待注册的屏幕：

```bash
curl -H "Authorization: Bearer $AI_SCREEN_TOKEN" \
  "$AI_SCREEN_URL/api/screens"
```

响应中的屏幕状态：
- `pending` - 等待注册确认的屏幕
- `active` - 已激活，可以投影内容
- `inactive` - 已失效，需要重新激活

### 2. 确认新屏幕注册

当发现 `pending` 状态的屏幕时，调用确认接口完成注册：

```bash
curl -X POST \
  -H "Authorization: Bearer $AI_SCREEN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name_en": "Main Display", "name_zh": "主显示屏"}' \
  "$AI_SCREEN_URL/api/screens/{screen_id}/confirm"
```

### 3. 投影内容

#### 投影模式选择

| 模式 | 适用场景 | 注意事项 |
|------|----------|----------|
| `inline_html` | 简单静态内容（文字、图表、天气卡片） | JavaScript 可能受限，复杂动画可能不工作 |
| `iframe` | 需要 JavaScript 的交互内容（时钟、动态图表、游戏） | 建议上传为附件或使用外部 URL |

**建议**：复杂交互内容一律使用 `iframe` + 附件上传模式。

#### 方式一：Inline HTML

直接向屏幕注入 HTML 内容（适合静态内容）：

```bash
curl -X POST \
  -H "Authorization: Bearer $AI_SCREEN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "inline_html",
    "content": "<div style=\"text-align:center;\"><h1>Hello World</h1></div>"
  }' \
  "$AI_SCREEN_URL/api/screens/{screen_id}/project"
```

#### 方式二：IFrame

在屏幕中嵌入 iframe 加载指定 URL（适合需要 JavaScript 的内容）：

```bash
curl -X POST \
  -H "Authorization: Bearer $AI_SCREEN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "iframe",
    "content": "https://example.com"
  }' \
  "$AI_SCREEN_URL/api/screens/{screen_id}/project"
```

### 4. 上传附件并显示

如需显示本地文件（图片、PDF、HTML等），先上传附件：

```bash
# 上传文件
curl -X POST \
  -H "Authorization: Bearer $AI_SCREEN_TOKEN" \
  -F "file=@/path/to/file.html" \
  "$AI_SCREEN_URL/api/attachments"
```

响应示例：
```json
{
  "attachment": {
    "id": "uuid",
    "filename": "file.html",
    "url": "/attachments/uuid?t=token"
  }
}
```

然后使用 iframe 模式投影：

```bash
curl -X POST \
  -H "Authorization: Bearer $AI_SCREEN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "iframe",
    "content": "",
    "attachment_url": "/attachments/{id}?t={token}"
  }' \
  "$AI_SCREEN_URL/api/screens/{screen_id}/project"
```

**附件访问支持 `$screen_token` 占位符**：如果 URL 中需要屏幕的访问 token，使用 `$screen_token` 占位符，屏幕端会自动替换。

示例：发送包含占位符的 HTML，屏幕端自动替换为实际 token

```bash
curl -X POST \
  -H "Authorization: Bearer $AI_SCREEN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "inline_html",
    "content": "<img src=\"/attachments/xxx?t=$screen_token\">"
  }' \
  "$AI_SCREEN_URL/api/screens/{screen_id}/project"
```

## 屏幕管理

### 编辑屏幕名称

```bash
curl -X PATCH \
  -H "Authorization: Bearer $AI_SCREEN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name_en": "New Name", "name_zh": "新名称"}' \
  "$AI_SCREEN_URL/api/screens/{screen_id}"
```

### 失效屏幕

使屏幕 token 失效（屏幕将断开连接）：

```bash
curl -X POST \
  -H "Authorization: Bearer $AI_SCREEN_TOKEN" \
  "$AI_SCREEN_URL/api/screens/{screen_id}/deactivate"
```

### 删除屏幕

彻底删除屏幕记录：

```bash
curl -X DELETE \
  -H "Authorization: Bearer $AI_SCREEN_TOKEN" \
  "$AI_SCREEN_URL/api/screens/{screen_id}"
```

## 常见任务模式

### 在指定屏幕上显示内容

当用户说"在客厅屏幕上显示天气"时：

1. 查询所有屏幕找到匹配的（name_en 或 name_zh 包含"客厅"）
2. 确认屏幕状态为 `active`
3. 调用投影接口发送内容

### 新屏幕注册流程

当用户打开新的浏览器窗口访问屏幕页面时：

1. 定期查询 `/api/screens` 检查新的 `pending` 屏幕
2. 向用户展示 pending 屏幕列表
3. 用户选择要确认的屏幕并提供名称
4. 调用确认注册接口

### 多屏幕广播

向多个屏幕发送相同内容：

```bash
# 遍历所有 active 状态的屏幕，分别调用投影接口
for screen_id in $(get_active_screens); do
  curl -X POST ... "$AI_SCREEN_URL/api/screens/$screen_id/project"
done
```

## 便捷脚本

技能包提供了一些实用的 Bash 脚本（位于 `scripts/` 目录）：

### list_screens.sh - 列出所有屏幕
```bash
scripts/list_screens.sh
```

### confirm_screen.sh - 确认注册屏幕
```bash
scripts/confirm_screen.sh <screen_id> <name_en> <name_zh>
# 示例：
scripts/confirm_screen.sh screen_abc "Living Room" "客厅"
```

### project_html.sh - 投影 HTML 文件
```bash
scripts/project_html.sh <screen_id> <html_file>
# 示例：
scripts/project_html.sh screen_abc ./content.html
```

### upload_and_project.sh - 上传文件并投影
```bash
scripts/upload_and_project.sh <screen_id> <file>
# 示例：
scripts/upload_and_project.sh screen_abc ./presentation.pdf
```

## 错误处理

常见错误及处理：

- `401 Unauthorized` - AI_TOKEN 无效或未设置
- `404 Screen not found` - 屏幕 ID 不存在
- `400 Screen is not active` - 屏幕处于 pending 或 inactive 状态
- `503 Screen is offline` - 屏幕 WebSocket 未连接

## 参考资料

详细 API 文档见 [references/api.md](references/api.md)
