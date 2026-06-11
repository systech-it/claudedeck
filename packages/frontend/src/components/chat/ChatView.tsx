import { useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useChatStore, newMsgId } from '@/stores/chat.store';
import { useSessionStore } from '@/stores/session.store';
import { wsClient } from '@/api/ws';
import { api } from '@/api/http';
import { Message } from './Message';
import { ChatInput } from './ChatInput';
import { PermissionDialog } from './PermissionDialog';
import type { ServerMessage } from '@claudedeck/shared';
import { Bot } from 'lucide-react';

export function ChatView() {
  const { sessionId } = useParams<{ sessionId?: string }>();
  const activeSessionId = sessionId ?? 'new';
  const navigate = useNavigate();
  const bottomRef = useRef<HTMLDivElement>(null);
  const currentMsgIdRef = useRef<string | null>(null);
  // Keep a ref so the stable WS listener always has the latest activeSessionId
  const activeSessionIdRef = useRef(activeSessionId);
  activeSessionIdRef.current = activeSessionId;

  const messages = useChatStore((s) => s.messages[activeSessionId] ?? []);
  const isStreaming = useChatStore((s) => s.streamingIds.has(activeSessionId));
  const permission = useChatStore((s) => s.pendingPermissions[activeSessionId] ?? null);
  const wsConnected = useChatStore((s) => s.wsConnected);
  const setSessions = useSessionStore((s) => s.setSessions);

  const {
    addMessage,
    appendText,
    appendThinking,
    setThinkingTokens,
    addToolStart,
    updateToolEnd,
    finalizeMessage,
    setPermission,
    setStreaming,
  } = useChatStore();

  useEffect(() => {
    const unsub = wsClient.onMessage((msg: ServerMessage) => {
      const sid = 'sessionId' in msg ? (msg as { sessionId: string }).sessionId : activeSessionIdRef.current;

      switch (msg.type) {
        case 'session_ready': {
          const id = newMsgId();
          currentMsgIdRef.current = id;

          const currentActiveId = activeSessionIdRef.current;
          if (sid !== currentActiveId) {
            // Backend created a new session — move any locally-added user messages to it
            const pending = useChatStore.getState().messages[currentActiveId] ?? [];
            pending.forEach((pm) => useChatStore.getState().addMessage(sid, pm));
            // Navigate to the real session and refresh sidebar
            navigate(`/session/${sid}`);
            api.sessions.list().then(setSessions).catch(console.error);
          }

          addMessage(sid, { id, role: 'assistant', content: '', isStreaming: true });
          setStreaming(sid, true);
          break;
        }

        case 'text_delta':
          if (currentMsgIdRef.current) appendText(sid, currentMsgIdRef.current, msg.text);
          break;

        case 'thinking_progress':
          if (currentMsgIdRef.current) setThinkingTokens(sid, currentMsgIdRef.current, msg.tokens);
          break;

        case 'thinking_delta':
          if (currentMsgIdRef.current) appendThinking(sid, currentMsgIdRef.current, msg.text);
          break;

        case 'tool_start':
          if (currentMsgIdRef.current) {
            addToolStart(sid, currentMsgIdRef.current, {
              id: msg.toolId,
              name: msg.toolName,
              input: msg.input,
              status: 'running',
            });
          }
          break;

        case 'tool_end':
          if (currentMsgIdRef.current) {
            updateToolEnd(sid, currentMsgIdRef.current, msg.toolId, msg.output, msg.isError);
          }
          break;

        case 'permission_request':
          setPermission(sid, {
            requestId: msg.requestId,
            toolName: msg.toolName,
            toolInput: msg.toolInput,
            description: msg.description,
          });
          break;

        case 'message_complete':
          if (currentMsgIdRef.current) {
            finalizeMessage(sid, currentMsgIdRef.current, {
              usage: msg.usage,
              costUsd: msg.costUsd,
              durationMs: msg.durationMs,
            });
            currentMsgIdRef.current = null;
          }
          setStreaming(sid, false);
          // Refresh sidebar so the session title/count updates
          api.sessions.list().then(setSessions).catch(console.error);
          break;

        case 'error':
          setStreaming(sid, false);
          if (currentMsgIdRef.current) {
            finalizeMessage(sid, currentMsgIdRef.current, {});
            currentMsgIdRef.current = null;
          }
          addMessage(sid, {
            id: newMsgId(),
            role: 'assistant',
            content: `**Error:** ${msg.message}`,
          });
          break;
      }
    });

    return unsub;
    // navigate, setSessions, and store actions are all stable references
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load history from JSONL when navigating to a session with no messages in store
  useEffect(() => {
    if (!activeSessionId || activeSessionId === 'new') return;
    const existing = useChatStore.getState().messages[activeSessionId];
    if (existing && existing.length > 0) return;
    api.sessions.history(activeSessionId).then((msgs) => {
      if (!msgs.length) return;
      msgs.forEach((m) =>
        useChatStore.getState().addMessage(activeSessionId, {
          id: newMsgId(),
          role: m.role,
          content: m.content,
        })
      );
    }).catch(() => {});
  }, [activeSessionId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, isStreaming]);

  const handleSend = useCallback(
    (content: string, model?: string, effort?: string) => {
      addMessage(activeSessionId, { id: newMsgId(), role: 'user', content });
      wsClient.send({ type: 'send_message', sessionId: activeSessionId, content, model, effort });
    },
    [activeSessionId, addMessage]
  );

  const handleStop = useCallback(() => {
    wsClient.send({ type: 'stop', sessionId: activeSessionId });
    setStreaming(activeSessionId, false);
  }, [activeSessionId, setStreaming]);

  const handlePermissionResponse = useCallback(
    (allow: boolean) => {
      if (!permission) return;
      wsClient.send({
        type: 'permission_response',
        sessionId: activeSessionId,
        requestId: permission.requestId,
        allow,
      });
      setPermission(activeSessionId, null);
    },
    [activeSessionId, permission, setPermission]
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
            <Bot className="h-12 w-12 opacity-30" />
            <p className="text-sm">Start a conversation with Claude Code</p>
          </div>
        ) : (
          <div className="py-4">
            {messages.map((msg) => (
              <Message key={msg.id} message={msg} />
            ))}
            {permission && (
              <PermissionDialog permission={permission} onRespond={handlePermissionResponse} />
            )}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <ChatInput
        onSend={handleSend}
        onStop={handleStop}
        isStreaming={isStreaming}
        disabled={!wsConnected}
      />
    </div>
  );
}
