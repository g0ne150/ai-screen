import { Database } from 'bun:sqlite';
import { CONFIG } from './config';

export interface Screen {
  id: string;
  name_en: string;
  name_zh: string;
  token: string | null;
  status: 'pending' | 'active' | 'inactive';
  created_at: number;
  updated_at: number;
}

export interface Attachment {
  id: string;
  filename: string;
  mime_type: string;
  size: number;
  token: string;
  created_at: number;
}

class DatabaseManager {
  private db: Database;

  constructor() {
    // 确保数据目录存在 - 使用同步方式
    const dataDir = CONFIG.DATABASE_PATH.split('/').slice(0, -1).join('/');
    if (dataDir) {
      try {
        // 使用 fs 同步创建目录
        const fs = require('fs');
        const path = require('path');
        const absoluteDir = path.resolve(dataDir);
        if (!fs.existsSync(absoluteDir)) {
          fs.mkdirSync(absoluteDir, { recursive: true });
        }
      } catch (err) {
        console.error('Failed to create data directory:', err);
      }
    }

    this.db = new Database(CONFIG.DATABASE_PATH);
    this.initTables();
  }

  private initTables() {
    // 屏幕表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS screens (
        id TEXT PRIMARY KEY,
        name_en TEXT,
        name_zh TEXT,
        token TEXT UNIQUE,
        status TEXT DEFAULT 'pending',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);

    // 附件表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS attachments (
        id TEXT PRIMARY KEY,
        filename TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        size INTEGER NOT NULL,
        token TEXT UNIQUE NOT NULL,
        created_at INTEGER NOT NULL
      )
    `);
  }

  // 屏幕相关操作
  createScreen(id: string): Screen {
    const now = Date.now();

    this.db.run(
      'INSERT INTO screens (id, name_en, name_zh, token, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, '', '', null, 'pending', now, now]
    );

    return {
      id,
      name_en: '',
      name_zh: '',
      token: null,
      status: 'pending',
      created_at: now,
      updated_at: now,
    };
  }

  getScreen(id: string): Screen | null {
    return this.db.query('SELECT * FROM screens WHERE id = ?').get(id) as Screen | null;
  }

  getScreenByToken(token: string): Screen | null {
    return this.db.query('SELECT * FROM screens WHERE token = ?').get(token) as Screen | null;
  }

  getAllScreens(): Screen[] {
    return this.db.query('SELECT * FROM screens ORDER BY created_at DESC').all() as Screen[];
  }

  confirmScreen(id: string, nameEn: string, nameZh: string): Screen | null {
    const now = Date.now();
    const result = this.db.run(
      'UPDATE screens SET name_en = ?, name_zh = ?, token = ?, status = ?, updated_at = ? WHERE id = ?',
      [nameEn, nameZh, this.generateToken(), 'active', now, id]
    );

    if (result.changes === 0) {
      return null;
    }

    return this.getScreen(id);
  }

  updateScreen(id: string, updates: Partial<Pick<Screen, 'name_en' | 'name_zh'>>): Screen | null {
    const screen = this.getScreen(id);
    if (!screen) return null;

    const now = Date.now();
    const nameEn = updates.name_en ?? screen.name_en;
    const nameZh = updates.name_zh ?? screen.name_zh;

    this.db.run(
      'UPDATE screens SET name_en = ?, name_zh = ?, updated_at = ? WHERE id = ?',
      [nameEn, nameZh, now, id]
    );

    return this.getScreen(id);
  }

  deactivateScreen(id: string): boolean {
    const result = this.db.run(
      'UPDATE screens SET status = ?, updated_at = ? WHERE id = ?',
      ['inactive', Date.now(), id]
    );
    return result.changes > 0;
  }

  regenerateScreenToken(id: string): string | null {
    const newToken = this.generateToken();
    const result = this.db.run(
      'UPDATE screens SET token = ?, updated_at = ? WHERE id = ?',
      [newToken, Date.now(), id]
    );
    return result.changes > 0 ? newToken : null;
  }

  deleteScreen(id: string): boolean {
    const result = this.db.run('DELETE FROM screens WHERE id = ?', [id]);
    return result.changes > 0;
  }

  // 附件相关操作
  createAttachment(id: string, filename: string, mimeType: string, size: number): Attachment {
    const token = this.generateToken();
    const now = Date.now();

    this.db.run(
      'INSERT INTO attachments (id, filename, mime_type, size, token, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [id, filename, mimeType, size, token, now]
    );

    return {
      id,
      filename,
      mime_type: mimeType,
      size,
      token,
      created_at: now,
    };
  }

  getAttachment(id: string): Attachment | null {
    return this.db.query('SELECT * FROM attachments WHERE id = ?').get(id) as Attachment | null;
  }

  getAttachmentByToken(token: string): Attachment | null {
    return this.db.query('SELECT * FROM attachments WHERE token = ?').get(token) as Attachment | null;
  }

  deleteAttachment(id: string): boolean {
    const result = this.db.run('DELETE FROM attachments WHERE id = ?', [id]);
    return result.changes > 0;
  }

  private generateToken(): string {
    return crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
  }
}

export const db = new DatabaseManager();
