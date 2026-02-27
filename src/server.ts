import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from 'hono/bun';
import { CONFIG, validateConfig } from './config';
import { db, Screen } from './database';

// WebSocket 连接管理
const wsConnections = new Map<string, WebSocket>(); // screen_id -> WebSocket

const app = new Hono();

// CORS 中间件
app.use('*', cors({ origin: '*', credentials: true }));

// 静态文件服务
app.use('/attachments/*', serveStatic({ root: './static' }));

// 根路径 -> index.html
app.get('/', serveStatic({ path: './static/index.html' }));

// display.html
app.get('/display.html', serveStatic({ path: './static/display.html' }));

// ========== AI Agent API 中间件 ==========
const aiAuthMiddleware = async (c: any, next: any) => {
  const authHeader = c.req.header('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token || token !== CONFIG.AI_TOKEN) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  await next();
};

// ========== AI Agent API 路由 ==========

// 1. 查询所有屏幕
app.get('/api/screens', aiAuthMiddleware, (c) => {
  const screens = db.getAllScreens();
  return c.json({ screens });
});

// 2. 确认注册屏幕
app.post('/api/screens/:id/confirm', aiAuthMiddleware, async (c) => {
  const id = c.req.param('id');
  const { name_en, name_zh } = await c.req.json();

  if (!name_en || !name_zh) {
    return c.json({ error: 'name_en and name_zh are required' }, 400);
  }

  const screen = db.confirmScreen(id, name_en, name_zh);
  if (!screen) {
    return c.json({ error: 'Screen not found' }, 404);
  }

  // 通知屏幕注册成功
  const ws = wsConnections.get(id);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'registered',
      data: { name_en, name_zh, token: screen.token }
    }));
  }

  return c.json({ screen });
});

// 3. 编辑屏幕
app.patch('/api/screens/:id', aiAuthMiddleware, async (c) => {
  const id = c.req.param('id');
  const { name_en, name_zh } = await c.req.json();

  const screen = db.updateScreen(id, { name_en, name_zh });
  if (!screen) {
    return c.json({ error: 'Screen not found' }, 404);
  }

  return c.json({ screen });
});

// 4. 失效屏幕
app.post('/api/screens/:id/deactivate', aiAuthMiddleware, (c) => {
  const id = c.req.param('id');

  if (!db.deactivateScreen(id)) {
    return c.json({ error: 'Screen not found' }, 404);
  }

  // 断开 WebSocket 连接
  const ws = wsConnections.get(id);
  if (ws) {
    ws.close(1008, 'Screen deactivated');
    wsConnections.delete(id);
  }

  return c.json({ success: true });
});

// 5. 删除屏幕
app.delete('/api/screens/:id', aiAuthMiddleware, (c) => {
  const id = c.req.param('id');

  // 断开 WebSocket 连接
  const ws = wsConnections.get(id);
  if (ws) {
    ws.close(1008, 'Screen deleted');
    wsConnections.delete(id);
  }

  if (!db.deleteScreen(id)) {
    return c.json({ error: 'Screen not found' }, 404);
  }

  return c.json({ success: true });
});

// 6. 上传附件
app.post('/api/attachments', aiAuthMiddleware, async (c) => {
  const formData = await c.req.formData();
  const file = formData.get('file') as File;

  if (!file) {
    return c.json({ error: 'No file provided' }, 400);
  }

  const id = crypto.randomUUID();
  const attachment = db.createAttachment(id, file.name, file.type, file.size);

  // 保存文件
  const filePath = `${CONFIG.ATTACHMENTS_DIR}/${id}`;
  try {
    await Bun.mkdir(CONFIG.ATTACHMENTS_DIR, { recursive: true });
  } catch {
    // 目录可能已存在
  }

  await Bun.write(filePath, await file.arrayBuffer());

  // 返回附件访问 URL（包含附件 token）
  const attachmentUrl = `/attachments/${id}?t=${attachment.token}`;

  return c.json({
    attachment: {
      ...attachment,
      url: attachmentUrl,
    },
  });
});

// 7. 屏幕投影
app.post('/api/screens/:id/project', aiAuthMiddleware, async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const { type, content, attachment_url } = body;

  if (!type || !['inline_html', 'iframe'].includes(type)) {
    return c.json({ error: 'Invalid type. Must be inline_html or iframe' }, 400);
  }

  const screen = db.getScreen(id);
  if (!screen) {
    return c.json({ error: 'Screen not found' }, 404);
  }

  if (screen.status !== 'active') {
    return c.json({ error: 'Screen is not active' }, 400);
  }

  const ws = wsConnections.get(id);
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    return c.json({ error: 'Screen is offline' }, 503);
  }

  // 发送投影内容到屏幕
  const projectData: any = {
    type: 'project',
    data: {
      project_type: type,
      content: content || '',
    },
  };

  if (attachment_url) {
    projectData.data.attachment_url = attachment_url;
  }

  ws.send(JSON.stringify(projectData));

  return c.json({ success: true });
});

// ========== 屏幕端 API 路由 ==========

// 附件访问（屏幕用）- 需要屏幕 token 验证
app.get('/attachments/:id', async (c) => {
  const id = c.req.param('id');
  const token = c.req.query('t');

  if (!token) {
    return c.text('Unauthorized', 401);
  }

  const attachment = db.getAttachmentByToken(token);
  if (!attachment || attachment.id !== id) {
    return c.text('Unauthorized', 401);
  }

  const filePath = `${CONFIG.ATTACHMENTS_DIR}/${id}`;
  const file = Bun.file(filePath);

  if (!(await file.exists())) {
    return c.text('File not found', 404);
  }

  c.header('Content-Type', attachment.mime_type);
  c.header('Content-Disposition', `inline; filename="${attachment.filename}"`);
  return c.body(file);
});

// ========== WebSocket 处理 ==========

const handleWebSocket = {
  async message(ws: WebSocket, message: string | Buffer) {
    try {
      const data = JSON.parse(message.toString());

      // 处理心跳
      if (data.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        return;
      }
    } catch {
      // 忽略无效消息
    }
  },

  open(ws: WebSocket) {
    // WebSocket 连接会在 URL 中携带 token，需要验证
    const url = new URL((ws as any).data?.url || 'ws://localhost');
    const token = url.searchParams.get('token');

    if (!token) {
      ws.close(1008, 'Token required');
      return;
    }

    // 处理 pending 状态的屏幕注册
    if (token === 'pending') {
      // 从 URL 获取 screen_id，如果没有则生成
      let screenId = url.searchParams.get('screen_id');
      if (!screenId) {
        // 尝试从 referer 或 origin 推断，或者直接生成
        screenId = 'screen_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
      }

      // 检查屏幕是否已存在
      let screen = db.getScreen(screenId);
      if (!screen) {
        // 创建新的 pending 屏幕
        screen = db.createScreen(screenId);
      }

      // 存储连接，但不立即返回成功（等待注册确认）
      (ws as any).screenId = screen.id;
      (ws as any).isPending = true;
      wsConnections.set(screen.id, ws);

      // 发送等待注册消息
      ws.send(JSON.stringify({
        type: 'connected',
        data: {
          screen_id: screen.id,
          status: 'pending',
          message: 'Waiting for AI agent confirmation',
        },
      }));

      console.log(`Screen ${screen.id} connected (pending registration)`);
      return;
    }

    const screen = db.getScreenByToken(token);
    if (!screen) {
      ws.close(1008, 'Invalid token');
      return;
    }

    if (screen.status !== 'active') {
      ws.close(1008, 'Screen not active');
      return;
    }

    // 存储连接
    (ws as any).screenId = screen.id;
    wsConnections.set(screen.id, ws);

    // 发送连接成功消息
    ws.send(JSON.stringify({
      type: 'connected',
      data: {
        screen_id: screen.id,
        name_en: screen.name_en,
        name_zh: screen.name_zh,
      },
    }));

    console.log(`Screen ${screen.id} connected`);
  },

  close(ws: WebSocket) {
    const screenId = (ws as any).screenId;
    if (screenId) {
      wsConnections.delete(screenId);
      console.log(`Screen ${screenId} disconnected`);
    }
  },

  error(ws: WebSocket, error: Error) {
    console.error('WebSocket error:', error);
  },
};

// ========== 启动服务 ==========

validateConfig();

const server = Bun.serve({
  port: CONFIG.PORT,
  fetch(req, server) {
    const url = new URL(req.url);

    // WebSocket 升级
    if (url.pathname === '/ws') {
      const success = server.upgrade(req, { data: { url: req.url } });
      return success ? undefined : new Response('WebSocket upgrade failed', { status: 400 });
    }

    // Hono 处理 HTTP 请求
    return app.fetch(req, server);
  },
  websocket: handleWebSocket,
});

console.log(`AI Screen relay server running at http://localhost:${CONFIG.PORT}`);
console.log(`WebSocket endpoint: ws://localhost:${CONFIG.PORT}/ws`);
