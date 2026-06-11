import type { TokenUsage } from './session.js';
import type { ToolName } from './tool.js';

// ─── Client → Server ──────────────────────────────────────

export type ClientMessage =
  | { type: 'send_message'; sessionId: string; content: string; model?: string; effort?: string; permissionMode?: string; remoteControl?: boolean; attachments?: Array<{ name: string; mimeType: string; data: string }> }
  | { type: 'permission_response'; sessionId: string; requestId: string; allow: boolean }
  | { type: 'stop'; sessionId: string }
  | { type: 'ping' };

// ─── Server → Client ──────────────────────────────────────

export type ServerMessage =
  | { type: 'pong' }
  | { type: 'session_ready'; sessionId: string }
  | { type: 'text_delta'; sessionId: string; text: string }
  | { type: 'thinking_delta'; sessionId: string; text: string }
  | { type: 'tool_start'; sessionId: string; toolId: string; toolName: ToolName; input: unknown }
  | { type: 'tool_end'; sessionId: string; toolId: string; output: string; isError: boolean }
  | {
      type: 'permission_request';
      sessionId: string;
      requestId: string;
      toolName: ToolName;
      toolInput: unknown;
      description: string;
    }
  | {
      type: 'message_complete';
      sessionId: string;
      usage?: TokenUsage;
      costUsd?: number;
      durationMs?: number;
    }
  | { type: 'thinking_progress'; sessionId: string; tokens: number }
  | { type: 'error'; sessionId: string; message: string }
  | { type: 'update_available'; version: string; releaseUrl: string; body: string };
