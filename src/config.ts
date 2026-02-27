// 配置文件 - 实际使用时应从环境变量或配置文件读取

export const CONFIG = {
  // AI Agent 访问令牌 - 必须设置
  AI_TOKEN: process.env.AI_TOKEN || 'your-ai-token-here-change-in-production',

  // 服务端口
  PORT: parseInt(process.env.PORT || '3000'),

  // WebSocket 心跳间隔 (毫秒)
  WS_HEARTBEAT_INTERVAL: 30000,

  // 附件存储目录 (统一放到 static 下)
  ATTACHMENTS_DIR: './static/attachments',

  // SQLite 数据库路径
  DATABASE_PATH: './data/ai-screen.db',
};

// 验证 AI Token 是否已设置
export function validateConfig() {
  if (CONFIG.AI_TOKEN === 'your-ai-token-here-change-in-production') {
    console.warn('警告: 使用默认 AI Token，请在生产环境中设置环境变量 AI_TOKEN');
  }
}
