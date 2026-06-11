import * as pty from 'node-pty';
import { EventEmitter } from 'events';
import { mkdirSync } from 'fs';
import { nanoid } from 'nanoid';
import { config } from '../config.js';
import { getUserProfileDir, getUserApiKey } from './auth.service.js';
import { getSession, updateSessionMeta, extractTitleFromJsonl } from './session.service.js';

export type ProcessEvent =
  | { type: 'text_delta'; text: string }
  | { type: 'thinking_delta'; text: string }
  | { type: 'tool_start'; toolId: string; toolName: string; input: unknown }
  | { type: 'tool_end'; toolId: string; output: string; isError: boolean }
  | { type: 'permission_request'; requestId: string; toolName: string; toolInput: unknown; description: string }
  | { type: 'message_complete'; costUsd?: number; durationMs?: number; inputTokens?: number; outputTokens?: number }
  | { type: 'error'; message: string }
  | { type: 'exit' };

interface ActiveProcess {
  pty: pty.IPty;
  sessionId: string;
  userId: string;
  emitter: EventEmitter;
  buffer: string;
  startedAt: number;
  pendingPermissions: Map<string, (allow: boolean) => void>;
}

const activeProcesses = new Map<string, ActiveProcess>();

export function getProcess(sessionId: string): ActiveProcess | undefined {
  return activeProcesses.get(sessionId);
}

export function isSessionActive(sessionId: string): boolean {
  return activeProcesses.has(sessionId);
}

export function getProcessEmitter(sessionId: string): EventEmitter | null {
  return activeProcesses.get(sessionId)?.emitter ?? null;
}

export function spawnClaudeProcess(
  sessionId: string,
  userId: string,
  message: string,
  isResume: boolean
): EventEmitter {
  const existing = activeProcesses.get(sessionId);
  if (existing) {
    existing.pty.kill();
    activeProcesses.delete(sessionId);
  }

  const profileDir = getUserProfileDir(userId);
  mkdirSync(profileDir, { recursive: true });

  const session = getSession(sessionId, userId);
  const cwd = session?.projectPath ?? '/tmp';
  const apiKey = getUserApiKey(userId);

  const args = ['--output-format', 'stream-json', '--verbose'];
  if (isResume) {
    args.push('--resume', sessionId);
  }
  args.push('-p', message);

  const ptyProcess = pty.spawn(config.claudeBin, args, {
    name: 'xterm-256color',
    cols: 220,
    rows: 50,
    cwd,
    env: {
      ...process.env,
      ANTHROPIC_API_KEY: apiKey,
      CLAUDE_CONFIG_DIR: profileDir,
      HOME: profileDir,
      TERM: 'xterm-256color',
    },
  });

  const emitter = new EventEmitter();
  const proc: ActiveProcess = {
    pty: ptyProcess,
    sessionId,
    userId,
    emitter,
    buffer: '',
    startedAt: Date.now(),
    pendingPermissions: new Map(),
  };

  activeProcesses.set(sessionId, proc);

  ptyProcess.onData((data: string) => {
    proc.buffer += data;
    processBuffer(proc);
  });

  ptyProcess.onExit(({ exitCode }) => {
    flushBuffer(proc);
    activeProcesses.delete(sessionId);
    emitter.emit('event', { type: 'exit' } satisfies ProcessEvent);

    const title = extractTitleFromJsonl(userId, sessionId);
    if (title) {
      updateSessionMeta(sessionId, userId, { title, updatedAt: Date.now() });
    }
  });

  return emitter;
}

export function sendMessageToProcess(sessionId: string, message: string): boolean {
  const proc = activeProcesses.get(sessionId);
  if (!proc) return false;
  proc.pty.write(message + '\n');
  return true;
}

export function respondToPermission(sessionId: string, requestId: string, allow: boolean): void {
  const proc = activeProcesses.get(sessionId);
  if (!proc) return;

  const resolve = proc.pendingPermissions.get(requestId);
  if (resolve) {
    resolve(allow);
    proc.pendingPermissions.delete(requestId);
  }

  proc.pty.write(allow ? 'y\n' : 'n\n');
}

export function stopProcess(sessionId: string): void {
  const proc = activeProcesses.get(sessionId);
  if (!proc) return;
  proc.pty.write('\x03');
  setTimeout(() => {
    const p = activeProcesses.get(sessionId);
    if (p) {
      p.pty.kill();
      activeProcesses.delete(sessionId);
    }
  }, 2000);
}

function processBuffer(proc: ActiveProcess): void {
  const lines = proc.buffer.split('\n');
  proc.buffer = lines.pop() ?? '';

  for (const line of lines) {
    const clean = stripAnsi(line).trim();
    if (!clean) continue;
    parseLine(proc, clean);
  }
}

function flushBuffer(proc: ActiveProcess): void {
  const clean = stripAnsi(proc.buffer).trim();
  if (clean) parseLine(proc, clean);
  proc.buffer = '';
}

function parseLine(proc: ActiveProcess, line: string): void {
  if (!line.startsWith('{')) return;

  try {
    const event = JSON.parse(line);
    handleStreamEvent(proc, event);
  } catch {
    // non-JSON line, skip
  }
}

function handleStreamEvent(proc: ActiveProcess, event: Record<string, unknown>): void {
  const emit = (e: ProcessEvent) => proc.emitter.emit('event', e);

  switch (event.type) {
    case 'assistant': {
      const msg = event.message as Record<string, unknown>;
      const content = (msg?.content as unknown[]) ?? [];

      for (const block of content) {
        const b = block as Record<string, unknown>;

        if (b.type === 'text' && typeof b.text === 'string') {
          emit({ type: 'text_delta', text: b.text });
        } else if (b.type === 'thinking' && typeof b.thinking === 'string') {
          emit({ type: 'thinking_delta', text: b.thinking });
        } else if (b.type === 'tool_use') {
          emit({
            type: 'tool_start',
            toolId: String(b.id ?? ''),
            toolName: String(b.name ?? ''),
            input: b.input ?? {},
          });
        }
      }
      break;
    }

    case 'user': {
      const msg = event.message as Record<string, unknown>;
      const content = (msg?.content as unknown[]) ?? [];

      for (const block of content) {
        const b = block as Record<string, unknown>;
        if (b.type === 'tool_result') {
          const toolContent = b.content as unknown[];
          const output = Array.isArray(toolContent)
            ? toolContent.map((c: unknown) => (c as Record<string, string>).text ?? '').join('')
            : String(b.content ?? '');

          emit({
            type: 'tool_end',
            toolId: String(b.tool_use_id ?? ''),
            output,
            isError: Boolean(b.is_error),
          });
        }
      }
      break;
    }

    case 'system': {
      if (event.subtype === 'permission_request') {
        const requestId = nanoid(8);
        const toolName = String(event.tool_name ?? 'unknown');
        const toolInput = event.tool_input ?? {};
        const description = formatPermissionDescription(toolName, toolInput as Record<string, unknown>);

        emit({
          type: 'permission_request',
          requestId,
          toolName,
          toolInput,
          description,
        });
      }
      break;
    }

    case 'result': {
      const usage = event.usage as Record<string, number> | undefined;
      emit({
        type: 'message_complete',
        costUsd: typeof event.total_cost_usd === 'number' ? event.total_cost_usd : undefined,
        durationMs: typeof event.duration_ms === 'number' ? event.duration_ms : undefined,
        inputTokens: usage?.input_tokens,
        outputTokens: usage?.output_tokens,
      });

      if (event.session_id && typeof event.session_id === 'string') {
        updateSessionMeta(proc.sessionId, proc.userId, {
          updatedAt: Date.now(),
        });
      }
      break;
    }
  }
}

function formatPermissionDescription(toolName: string, input: Record<string, unknown>): string {
  switch (toolName) {
    case 'Bash':
      return `Run command: ${String(input.command ?? '').slice(0, 200)}`;
    case 'Write':
      return `Write file: ${String(input.file_path ?? '')}`;
    case 'Edit':
    case 'MultiEdit':
      return `Edit file: ${String(input.file_path ?? '')}`;
    default:
      return `Use tool: ${toolName}`;
  }
}

function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1B\[[0-9;]*[mGKHF]/g, '').replace(/\x1B\][^\x07]*\x07/g, '');
}
