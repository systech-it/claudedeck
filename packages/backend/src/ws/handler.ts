import type { WebSocket } from 'ws';
import type { FastifyRequest } from 'fastify';
import type { ClientMessage, ServerMessage } from '@claudedeck/shared';
import {
  spawnClaudeProcess,
  stopProcess,
  respondToPermission,
} from '../services/process.manager.js';
import { getSession, createSession } from '../services/session.service.js';
import type { AuthTokenPayload } from '@claudedeck/shared';

export function handleWsConnection(
  socket: WebSocket,
  request: FastifyRequest & { user?: AuthTokenPayload }
): void {
  const userId = request.user?.userId;

  if (!userId) {
    socket.send(JSON.stringify({ type: 'error', sessionId: '', message: 'Unauthorized' }));
    socket.close(4001, 'Unauthorized');
    return;
  }

  let pingTimer: ReturnType<typeof setInterval> | null = null;

  function send(msg: ServerMessage): void {
    if (socket.readyState === socket.OPEN) {
      socket.send(JSON.stringify(msg));
    }
  }

  function startPing(): void {
    pingTimer = setInterval(() => {
      if (socket.readyState === socket.OPEN) {
        socket.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30_000);
  }

  startPing();

  socket.on('message', async (raw: Buffer | string) => {
    let msg: ClientMessage;

    try {
      msg = JSON.parse(raw.toString()) as ClientMessage;
    } catch {
      return;
    }

    switch (msg.type) {
      case 'ping': {
        send({ type: 'pong' });
        break;
      }

      case 'send_message': {
        const { sessionId, content } = msg;

        let session = getSession(sessionId, userId);

        if (!session) {
          session = createSession(userId, '/tmp');
        }

        const claudeSessionId = session.claudeSessionId ?? null;
        const emitter = spawnClaudeProcess(session.id, userId, content, claudeSessionId, {
          model: (msg as { model?: string }).model,
          effort: (msg as { effort?: string }).effort,
          usesServerClaudeDir: session.usesServerClaudeDir ?? false,
        });

        send({ type: 'session_ready', sessionId: session.id });

        emitter.on('event', (event) => {
          switch (event.type) {
            case 'thinking_progress':
              send({ type: 'thinking_progress', sessionId: session!.id, tokens: event.tokens });
              break;

            case 'text_delta':
              send({ type: 'text_delta', sessionId: session!.id, text: event.text });
              break;

            case 'thinking_delta':
              send({ type: 'thinking_delta', sessionId: session!.id, text: event.text });
              break;

            case 'tool_start':
              send({
                type: 'tool_start',
                sessionId: session!.id,
                toolId: event.toolId,
                toolName: event.toolName,
                input: event.input,
              });
              break;

            case 'tool_end':
              send({
                type: 'tool_end',
                sessionId: session!.id,
                toolId: event.toolId,
                output: event.output,
                isError: event.isError,
              });
              break;

            case 'permission_request':
              send({
                type: 'permission_request',
                sessionId: session!.id,
                requestId: event.requestId,
                toolName: event.toolName,
                toolInput: event.toolInput,
                description: event.description,
              });
              break;

            case 'message_complete':
              send({
                type: 'message_complete',
                sessionId: session!.id,
                costUsd: event.costUsd,
                durationMs: event.durationMs,
                usage: event.inputTokens
                  ? { inputTokens: event.inputTokens, outputTokens: event.outputTokens ?? 0 }
                  : undefined,
              });
              break;

            case 'error':
              send({ type: 'error', sessionId: session!.id, message: event.message });
              break;
          }
        });

        break;
      }

      case 'permission_response': {
        respondToPermission(msg.sessionId, msg.requestId, msg.allow);
        break;
      }

      case 'stop': {
        stopProcess(msg.sessionId);
        break;
      }
    }
  });

  socket.on('close', () => {
    if (pingTimer) clearInterval(pingTimer);
  });

  socket.on('error', (err: Error) => {
    console.error('[ws] socket error:', err.message);
    if (pingTimer) clearInterval(pingTimer);
  });
}
