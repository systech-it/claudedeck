import { eq, desc, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { readFileSync, existsSync, readdirSync, unlinkSync, statSync } from 'fs';
import { join, basename } from 'path';
import { db } from '../db/index.js';
import { sessions, type DbSession } from '../db/schema.js';
import type { SessionSummary, JsonlMessage, HistoryMessage } from '@claudedeck/shared';
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
    claudeSessionId: null,
    usesServerClaudeDir: false,
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
  patch: Partial<Pick<DbSession, 'title' | 'messageCount' | 'totalCostUsd' | 'updatedAt' | 'claudeSessionId'>>
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

// ---------------------------------------------------------------------------
// Session history — parse JSONL and return messages for display
// ---------------------------------------------------------------------------

export function getSessionHistory(sessionId: string, userId: string): HistoryMessage[] {
  const session = getSession(sessionId, userId);
  if (!session) return [];

  let filePath: string;
  if (session.usesServerClaudeDir && session.claudeSessionId) {
    const encodedPath = session.projectPath.replace(/\//g, '-');
    filePath = join(SERVER_CLAUDE_DIR, 'projects', encodedPath, `${session.claudeSessionId}.jsonl`);
  } else {
    filePath = getSessionJsonlPath(userId, sessionId);
  }

  if (!existsSync(filePath)) return [];

  try {
    const lines = readFileSync(filePath, 'utf-8').split('\n').filter(Boolean);
    const messages: HistoryMessage[] = [];

    for (const line of lines) {
      try {
        const event = JSON.parse(line) as JsonlMessage;

        if (event.type === 'user' && event.message?.role === 'user') {
          const content = event.message.content;
          const isToolResult = Array.isArray(content) && content.some((b) => b.type === 'tool_result');
          if (isToolResult) continue;
          const text = typeof content === 'string'
            ? content
            : Array.isArray(content)
              ? content.filter((b) => b.type === 'text').map((b) => b.text ?? '').join('')
              : '';
          if (text.trim()) messages.push({ role: 'user', content: text.trim() });
        }

        if (event.type === 'assistant' && event.message?.role === 'assistant') {
          const content = event.message.content;
          const text = Array.isArray(content)
            ? content.filter((b) => b.type === 'text').map((b) => b.text ?? '').join('')
            : typeof content === 'string' ? content : '';
          if (text.trim()) messages.push({ role: 'assistant', content: text.trim() });
        }
      } catch { /* skip malformed line */ }
    }

    return messages;
  } catch { return []; }
}

// ---------------------------------------------------------------------------
// Server-side session sync — imports existing Claude Code sessions from the
// server's own ~/.claude/projects/ directory into the ClaudeDeck database so
// they appear in the sidebar and can be continued.
// ---------------------------------------------------------------------------

const SERVER_CLAUDE_DIR = join(process.env.HOME ?? '/root', '.claude');

function extractFirstUserMessage(filePath: string): string | null {
  try {
    const lines = readFileSync(filePath, 'utf-8').split('\n').filter(Boolean);
    for (const line of lines) {
      try {
        const m = JSON.parse(line);
        // ai-title takes priority
        if (m.type === 'ai-title' && m.aiTitle) return String(m.aiTitle);
        const msg = m.message ?? {};
        if (msg.role === 'user') {
          const c = msg.content;
          const text = typeof c === 'string' ? c : (Array.isArray(c) ? (c[0]?.text ?? '') : '');
          if (text.trim()) return text.trim();
        }
      } catch { /* skip malformed line */ }
    }
  } catch { /* unreadable file */ }
  return null;
}

export function syncServerSessions(userId: string): void {
  const projectsDir = join(SERVER_CLAUDE_DIR, 'projects');
  if (!existsSync(projectsDir)) return;

  // Collect all top-level (non-subagent) session JSONL files
  const projectDirs = readdirSync(projectsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => join(projectsDir, d.name));

  for (const pdir of projectDirs) {
    // Derive the original project path from the directory name
    // e.g. "-root-claudedeck" → "/root/claudedeck"
    const projectPath = ('/' + basename(pdir).replace(/^-/, '').replace(/-/g, '/')).replace('//', '/');

    let files: string[];
    try {
      files = readdirSync(pdir).filter((f) => f.endsWith('.jsonl'));
    } catch { continue; }

    for (const file of files) {
      const claudeSessionId = file.replace('.jsonl', '');
      // Skip subagent files (they sit inside a subdir named after the parent session)
      if (!claudeSessionId.match(/^[0-9a-f-]{36}$/)) continue;

      const filePath = join(pdir, file);

      // Check if already imported
      const existing = db
        .select({ id: sessions.id })
        .from(sessions)
        .where(and(eq(sessions.claudeSessionId, claudeSessionId), eq(sessions.userId, userId)))
        .get();
      if (existing) continue;

      const rawTitle = extractFirstUserMessage(filePath);
      const title = (rawTitle ?? 'Session').slice(0, SESSION_TITLE_MAX_LENGTH);

      let stat: ReturnType<typeof statSync>;
      try { stat = statSync(filePath); } catch { continue; }

      db.insert(sessions)
        .values({
          id: nanoid(21),
          userId,
          title,
          projectPath,
          claudeSessionId,
          usesServerClaudeDir: true,
          createdAt: Math.floor(stat.birthtimeMs),
          updatedAt: Math.floor(stat.mtimeMs),
          messageCount: 0,
          totalCostUsd: 0,
        })
        .onConflictDoNothing()
        .run();
    }
  }
}
