# AI Screen - AI Screen Relay Service

Multi-screen relay service for AI Agents, supporting real-time content projection.

## Architecture

```
┌─────────────┐      HTTP API + AI Token      ┌─────────────┐      WebSocket + Screen Token      ┌─────────────┐
│   AI Agent  │ ─────────────────────────────>│Relay Service│<──────────────────────────────────>│   Screen    │
│  (Skill/    │                               │    (Bun)    │                                    │  (Browser)  │
│   CLI, etc) │                               │             │<──────────────────────────────────>│             │
└─────────────┘                               └─────────────┘      (Attachment HTTP Download)     └─────────────┘
```

## Quick Start

### 1. Install Dependencies

```bash
bun install
```

### 2. Configuration

Set environment variables (or keep defaults for testing):

```bash
export AI_TOKEN="your-secure-ai-token-here"
export PORT=3000
```

### 3. Start Service

```bash
bun run dev    # Development mode (hot reload)
bun start      # Production mode
```

### 4. Access

- Screen Entry: `http://localhost:3000/static/index.html`
- AI Agent API: `http://localhost:3000/api/*`

## API Documentation

### Authentication

All AI Agent APIs require the following Header:
```
Authorization: Bearer {AI_TOKEN}
```

### Screen Management

#### List All Screens
```http
GET /api/screens
```

#### Confirm Screen Registration
```http
POST /api/screens/{screen_id}/confirm
Content-Type: application/json

{
  "name_en": "Main Display",
  "name_zh": "主显示屏"
}
```

#### Edit Screen
```http
PATCH /api/screens/{screen_id}
Content-Type: application/json

{
  "name_en": "New Name",
  "name_zh": "新名称"
}
```

#### Deactivate Screen
```http
POST /api/screens/{screen_id}/deactivate
```

#### Delete Screen
```http
DELETE /api/screens/{screen_id}
```

### Projection

#### Project Content to Screen
```http
POST /api/screens/{screen_id}/project
Content-Type: application/json

{
  "type": "inline_html",
  "content": "<h1>Hello World</h1>"
}
```

Or iframe mode:
```http
POST /api/screens/{screen_id}/project
Content-Type: application/json

{
  "type": "iframe",
  "content": "https://example.com",
  "attachment_url": "/attachments/{id}?t={token}"
}
```

**The `$screen_token` placeholder in content will be replaced with the screen's actual token.**

### Attachments

#### Upload Attachment
```http
POST /api/attachments
Content-Type: multipart/form-data

file: <binary>
```

Response:
```json
{
  "attachment": {
    "id": "...",
    "filename": "...",
    "url": "/attachments/{id}?t={token}"
  }
}
```

## Screen-Side Flow

1. Open `http://localhost:3000/static/index.html`
2. Automatically generate screen_id, redirect to display page and wait for registration
3. AI Agent queries the pending screen and calls the confirm registration API
4. Screen receives registration success message and starts receiving projection content

## Directory Structure

```
ai-screen/
├── src/
│   ├── server.ts      # Main server
│   ├── config.ts      # Configuration
│   └── database.ts    # SQLite database operations
├── static/
│   ├── index.html     # Screen entry (auto redirect/register)
│   └── display.html   # Screen display page
├── skill/
│   └── ai-screen/     # Claude Skill package
│       ├── SKILL.md
│       ├── scripts/
│       │   ├── list_screens.sh
│       │   ├── confirm_screen.sh
│       │   ├── project_html.sh
│       │   └── upload_and_project.sh
│       └── references/
│           └── api.md
├── attachments/       # Attachment storage directory (auto-created)
├── data/              # Database directory (auto-created)
└── package.json
```

## AI Agent Usage

This project includes the `skill/ai-screen/` directory, which is a Claude Skill package. AI Agents can operate screens by loading this Skill.

### Skill Usage

1. Set environment variables:
```bash
export AI_SCREEN_URL="http://localhost:3000"
export AI_SCREEN_TOKEN="your-ai-token"
```

2. Skill script tools:
```bash
# List all screens
./skill/ai-screen/scripts/list_screens.sh

# Confirm and register new screen
./skill/ai-screen/scripts/confirm_screen.sh <screen_id> <name_en> <name_zh>

# Project HTML file
./skill/ai-screen/scripts/project_html.sh <screen_id> <file.html>

# Upload and project file
./skill/ai-screen/scripts/upload_and_project.sh <screen_id> <file.pdf>
```

For detailed API reference, see `skill/ai-screen/references/api.md`

## Tech Stack

- [Bun](https://bun.sh/) - Runtime
- [Hono](https://hono.dev/) - Web framework
- Bun SQLite - Data storage
- WebSocket - Real-time communication

---

[中文文档](README_zh.md)
