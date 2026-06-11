import { create } from 'zustand';
import type { ToolBlock, TokenUsage } from '@claudedeck/shared';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  thinking?: string;
  tools?: ToolBlock[];
  usage?: TokenUsage;
  costUsd?: number;
  durationMs?: number;
  isStreaming?: boolean;
}

export interface PendingPermission {
  requestId: string;
  toolName: string;
  toolInput: unknown;
  description: string;
}

interface ChatState {
  messages: Record<string, ChatMessage[]>;
  streamingIds: Set<string>;
  pendingPermissions: Record<string, PendingPermission | null>;
  wsConnected: boolean;

  addMessage: (sessionId: string, msg: ChatMessage) => void;
  appendText: (sessionId: string, msgId: string, text: string) => void;
  appendThinking: (sessionId: string, msgId: string, text: string) => void;
  addToolStart: (sessionId: string, msgId: string, tool: ToolBlock) => void;
  updateToolEnd: (sessionId: string, msgId: string, toolId: string, output: string, isError: boolean) => void;
  finalizeMessage: (sessionId: string, msgId: string, meta: { usage?: TokenUsage; costUsd?: number; durationMs?: number }) => void;
  setPermission: (sessionId: string, perm: PendingPermission | null) => void;
  clearMessages: (sessionId: string) => void;
  setWsConnected: (v: boolean) => void;
  setStreaming: (sessionId: string, v: boolean) => void;
}

let msgCounter = 0;
export function newMsgId() { return `msg_${++msgCounter}`; }

export const useChatStore = create<ChatState>((set) => ({
  messages: {},
  streamingIds: new Set(),
  pendingPermissions: {},
  wsConnected: false,

  addMessage: (sessionId, msg) =>
    set((s) => ({
      messages: {
        ...s.messages,
        [sessionId]: [...(s.messages[sessionId] ?? []), msg],
      },
    })),

  appendText: (sessionId, msgId, text) =>
    set((s) => ({
      messages: {
        ...s.messages,
        [sessionId]: (s.messages[sessionId] ?? []).map((m) =>
          m.id === msgId ? { ...m, content: m.content + text } : m
        ),
      },
    })),

  appendThinking: (sessionId, msgId, text) =>
    set((s) => ({
      messages: {
        ...s.messages,
        [sessionId]: (s.messages[sessionId] ?? []).map((m) =>
          m.id === msgId ? { ...m, thinking: (m.thinking ?? '') + text } : m
        ),
      },
    })),

  addToolStart: (sessionId, msgId, tool) =>
    set((s) => ({
      messages: {
        ...s.messages,
        [sessionId]: (s.messages[sessionId] ?? []).map((m) =>
          m.id === msgId ? { ...m, tools: [...(m.tools ?? []), tool] } : m
        ),
      },
    })),

  updateToolEnd: (sessionId, msgId, toolId, output, isError) =>
    set((s) => ({
      messages: {
        ...s.messages,
        [sessionId]: (s.messages[sessionId] ?? []).map((m) =>
          m.id === msgId
            ? {
                ...m,
                tools: (m.tools ?? []).map((t) =>
                  t.id === toolId
                    ? { ...t, output, status: isError ? ('error' as const) : ('success' as const) }
                    : t
                ),
              }
            : m
        ),
      },
    })),

  finalizeMessage: (sessionId, msgId, meta) =>
    set((s) => ({
      messages: {
        ...s.messages,
        [sessionId]: (s.messages[sessionId] ?? []).map((m) =>
          m.id === msgId ? { ...m, ...meta, isStreaming: false } : m
        ),
      },
    })),

  setPermission: (sessionId, perm) =>
    set((s) => ({ pendingPermissions: { ...s.pendingPermissions, [sessionId]: perm } })),

  clearMessages: (sessionId) =>
    set((s) => ({ messages: { ...s.messages, [sessionId]: [] } })),

  setWsConnected: (v) => set({ wsConnected: v }),

  setStreaming: (sessionId, v) =>
    set((s) => {
      const next = new Set(s.streamingIds);
      v ? next.add(sessionId) : next.delete(sessionId);
      return { streamingIds: next };
    }),
}));
