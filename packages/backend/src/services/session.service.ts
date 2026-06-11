import { eq, desc, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { readFileSync, existsSync, readdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import { db } from '../db/index.js';
import { sessions, type DbSession } from '../db/schema.js';
import type { SessionSummary, JsonlMessage } from '@claudedeck/shared';
import { SESSION_TITLE_MAX_LENGTH } from '@claudedeck/shared';
import { getUserProfileDir } from './auth.service.js';

export function listUserSessions(userId: string): SessionSummary[] {
  const rows = db
    .select()
    .from(sessions)
    .where(eq(sessions.userId, userId))
    .orderBy(desc(sessions.updatedAt))
    .all();

  return rows.map(dbSessionToSummary);
}

export function getSession(sessionId: string, userId: string): DbSession | undefined {
  return db
    .select()
    .from(sessions)
    .where(and(eq(sessions.id, sessionId), eq(sessions.userId, userId)))
    .get();
}

export function createSession(userId: string, projectPath: string): DbSession {
  const id = nanoid(21);
  const now = Date.now();

  const session: DbSession = {
    id,
    userId,
    title: 'New session',
    projectPath,
    createdAt: now,
    updatedAt: now,
    messageCount: 0,
    totalCostUsd: 0,
  };

  db.insert(sessions).values(session).run();
  return session;
}

export function renameSession(sessionId: string, userId: string, title: string): void {
  const trimmed = title.trim().slice(0, SESSION_TITLE_MAX_LENGTH);
  db.update(sessions)
    .set({ title: trimmed, updatedAt: Date.now() })
    .where(and(eq(sessions.id, sessionId), eq(sessions.userId, userId)))
    .run();
}

export function deleteSession(sessionId: string, userId: string): void {
  const session = getSession(sessionId, userId);
  if (!session) throw new Error('Session not found');

  const jsonlPath = getSessionJsonlPath(userId, sessionId);
  if (existsSync(jsonlPath)) unlinkSync(jsonlPath);

  db.delete(sessions).where(and(eq(sessions.id, sessionId), eq(sessions.userId, userId))).run();
}

export function updateSessionMeta(
  sessionId: string,
  userId: string,
  patch: Partial<Pick<DbSession, 'title' | 'messageCount' | 'totalCostUsd' | 'updatedAt'>>
): void {
  db.update(sessions)
    .set({ ...patch, updatedAt: patch.updatedAt ?? Date.now() })
    .where(and(eq(sessions.id, sessionId), eq(sessions.userId, userId)))
    .run();
}

export function getSessionJsonlPath(userId: string, sessionId: string): string {
  const profileDir = getUserProfileDir(userId);
  return join(profileDir, 'projects', '-', `${sessionId}.jsonl`);
}

export function extractTitleFromJsonl(userId: string, sessionId: string): string | null {
  const filePath = getSessionJsonlPath(userId, sessionId);
  if (!existsSync(filePath)) return null;

  const lines = readFileSync(filePath, 'utf-8').split('\n').filter(Boolean);

  for (const line of lines) {
    try {
      const msg: JsonlMessage = JSON.parse(line);
      if (msg.type === 'ai-title' && msg.aiTitle) {
        return msg.aiTitle.slice(0, SESSION_TITLE_MAX_LENGTH);
      }
    } catch {
      continue;
    }
  }

  for (const line of lines) {
    try {
      const msg: JsonlMessage = JSON.parse(line);
      if (msg.message?.role === 'user') {
        const content = msg.message.content;
        const text = typeof content === 'string' ? content : content[0]?.text ?? '';
        if (text.trim()) {
          return text.trim().slice(0, SESSION_TITLE_MAX_LENGTH);
        }
      }
    } catch {
      continue;
    }
  }

  return null;
}

export function syncSessionsFromDisk(userId: string): void {
  const profileDir = getUserProfileDir(userId);
  const projectsDir = join(profileDir, 'projects', '-');

  if (!existsSync(projectsDir)) return;

  const files = readdirSync(projectsDir).filter((f) => f.endsWith('.jsonl'));

  for (const file of files) {
    const sessionId = file.replace('.jsonl', '');
    const existing = getSession(sessionId, userId);

    if (!existing) {
      const title = extractTitleFromJsonl(userId, sessionId) ?? 'Imported session';
      const stat = require('fs').statSync(join(projectsDir, file));
      db.insert(sessions)
        .values({
          id: sessionId,
          userId,
          title,
          projectPath: '/',
          createdAt: stat.birthtimeMs,
          updatedAt: stat.mtimeMs,
          messageCount: 0,
          totalCostUsd: 0,
        })
        .onConflictDoNothing()
        .run();
    }
  }
}

function dbSessionToSummary(row: DbSession): SessionSummary {
  return {
    id: row.id,
    title: row.title,
    projectPath: row.projectPath,
    updatedAt: row.updatedAt,
    isActive: false,
    messageCount: row.messageCount,
  };
}
