import * as pty from 'node-pty';
import { EventEmitter } from 'events';
import { mkdirSync, existsSync, symlinkSync } from 'fs';
import { join } from 'path';
import { nanoid } from 'nanoid';
import { config } from '../config.js';
import { getUserProfileDir } from './auth.service.js';
import { getSession, updateSessionMeta, extractTitleFromJsonl } from './session.service.js';

export type ProcessEvent =
  | { type: 'text_delta'; text: string }
  | { type: 'thinking_delta'; text: string }
  | { type: 'thinking_progress'; tokens: number }
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

const SERVER_CLAUDE_DIR = join(process.env.HOME ?? '/root', '.claude');

function buildContent(message: string, attachments?: Array<{ name: string; mimeType: string; data: string }>): unknown[] {
  const content: unknown[] = [{ type: 'text', text: message }];
  for (const att of attachments ?? []) {
    if (att.mimeType.startsWith('image/')) {
      content.push({ type: 'image', source: { type: 'base64', media_type: att.mimeType, data: att.data } });
    } else {
      content.push({ type: 'text', text: `\n[Attached file: ${att.name}]\n` });
    }
  }
  return content;
}

export function spawnClaudeProcess(
  sessionId: string,
  userId: string,
  message: string,
  claudeSessionId: string | null,
  opts: { model?: string; effort?: string; permissionMode?: string; remoteControl?: boolean; usesServerClaudeDir?: boolean; attachments?: Array<{ name: string; mimeType: string; data: string }> } = {}
): EventEmitter {
  // Dla Remote Control: jeśli proces już żyje, wyślij kolejną wiadomość jako czysty tekst do REPL
  if (opts.remoteControl) {
    const existing = activeProcesses.get(sessionId);
    if (existing) {
      try { existing.pty.write(message + '\n'); } catch { /* process może już być martwy */ }
      existing.emitter.emit('event', { type: 'text_delta', text: '*Wiadomość wysłana do sesji Remote Control — odpowiedź pojawi się na [claude.ai/code](https://claude.ai/code)*' } satisfies ProcessEvent);
      setTimeout(() => existing.emitter.emit('event', { type: 'message_complete' } satisfies ProcessEvent), 300);
      return existing.emitter;
    }
  }

  const existing = activeProcesses.get(sessionId);
  if (existing) {
    existing.pty.kill();
    activeProcesses.delete(sessionId);
  }

  // Determine which config dir to use: server's own dir (for existing sessions and RC)
  // or the per-user isolated dir (for new ClaudeDeck sessions)
  // RC zawsze używa serwer dir — potrzebuje prawdziwych credentials do claude.ai/code
  let claudeConfigDir: string;
  if (opts.usesServerClaudeDir || opts.remoteControl) {
    claudeConfigDir = SERVER_CLAUDE_DIR;
  } else {
    claudeConfigDir = getUserProfileDir(userId);
    mkdirSync(claudeConfigDir, { recursive: true });
    const serverCredentials = join(SERVER_CLAUDE_DIR, '.credentials.json');
    const userCredentials = join(claudeConfigDir, '.credentials.json');
    if (existsSync(serverCredentials) && !existsSync(userCredentials)) {
      try { symlinkSync(serverCredentials, userCredentials); } catch { /* ignore */ }
    }
  }

  const session = getSession(sessionId, userId);
  const cwd = (opts.usesServerClaudeDir && session?.projectPath && session.projectPath !== '/tmp')
    ? session.projectPath
    : (session?.projectPath ?? '/tmp');

  const hasAttachments = opts.attachments && opts.attachments.length > 0;

  // RC mode musi działać BEZ --output-format stream-json — ten flag wyłącza RC sesję na claude.ai/code
  const args: string[] = opts.remoteControl
    ? ['--remote-control']
    : ['--output-format', 'stream-json', '--verbose'];

  if (claudeSessionId) args.push('--resume', claudeSessionId);
  if (opts.model) args.push('--model', opts.model);
  if (opts.effort) args.push('--effort', opts.effort);
  if (opts.permissionMode) args.push('--permission-mode', opts.permissionMode);

  if (opts.remoteControl) {
    // REPL mode z Remote Control — bez stream-json, bez -p
  } else if (hasAttachments) {
    args.push('--input-format', 'stream-json', '--print');
  } else {
    args.push('-p', message);
  }

  const ptyProcess = pty.spawn(config.claudeBin, args, {
    name: 'xterm-256color',
    cols: 220,
    rows: 50,
    cwd: existsSync(cwd) ? cwd : '/tmp',
    env: {
      ...process.env,
      CLAUDE_CONFIG_DIR: claudeConfigDir,
      HOME: opts.usesServerClaudeDir ? (process.env.HOME ?? '/root') : claudeConfigDir,
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

  if (opts.remoteControl) {
    // RC REPL: wyślij pierwszą wiadomość po inicjalizacji REPL (2s)
    // Odpowiedź trafia do claude.ai/code — pokazujemy info w czacie
    setTimeout(() => {
      try { ptyProcess.write(message + '\n'); } catch { /* process may have exited */ }
      emitter.emit('event', { type: 'text_delta', text: '*Sesja Remote Control aktywna — wiadomość wysłana. Odpowiedź pojawi się na [claude.ai/code](https://claude.ai/code)*' } satisfies ProcessEvent);
      setTimeout(() => emitter.emit('event', { type: 'message_complete' } satisfies ProcessEvent), 300);
    }, 2000);
  } else if (hasAttachments) {
    const content = buildContent(message, opts.attachments);
    const inputLine = JSON.stringify({ type: 'user', message: { role: 'user', content } });
    setTimeout(() => {
      try { ptyProcess.write(inputLine + '\n'); } catch { /* process may have exited */ }
    }, 300);
  }

  ptyProcess.onData((data: string) => {
    proc.buffer += data;
    processBuffer(proc);
  });

  ptyProcess.onExit(({ exitCode }) => {
    flushBuffer(proc);
    activeProcesses.delete(sessionId);
    // Eksity przez sygnały (128-143: SIGHUP=129, SIGINT=130, SIGKILL=137) są normalne przy STOP
    const isSignalExit = exitCode !== undefined && exitCode > 128 && exitCode <= 143;
    if (exitCode !== 0 && exitCode !== undefined && !isSignalExit) {
      emitter.emit('event', { type: 'error', message: `Process exited with code ${exitCode}` } satisfies ProcessEvent);
    }
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
    case 'system': {
      if (event.subtype === 'init' && typeof event.session_id === 'string') {
        updateSessionMeta(proc.sessionId, proc.userId, { claudeSessionId: event.session_id });
      } else if (event.subtype === 'thinking_tokens' && typeof event.estimated_tokens === 'number') {
        emit({ type: 'thinking_progress', tokens: event.estimated_tokens });
      } else if (event.subtype === 'permission_request') {
        const requestId = nanoid(8);
        const toolName = String(event.tool_name ?? 'unknown');
        const toolInput = event.tool_input ?? {};
        const description = formatPermissionDescription(toolName, toolInput as Record<string, unknown>);
        emit({ type: 'permission_request', requestId, toolName, toolInput, description });
      }
      break;
    }

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
