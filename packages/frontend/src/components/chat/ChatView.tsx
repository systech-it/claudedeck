import { useEffect, useRef, useCallback, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useChatStore, newMsgId } from '@/stores/chat.store';
import { useSessionStore } from '@/stores/session.store';
import { wsClient } from '@/api/ws';
import { api } from '@/api/http';
import { Message } from './Message';
import { ChatInput } from './ChatInput';
import { PermissionDialog } from './PermissionDialog';
import type { ServerMessage } from '@claudedeck/shared';
import { Bot, Cpu, Zap, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSettingsStore } from '@/stores/settings.store';
import { useUsage } from '@/hooks/useUsage';
import { UsageChip } from './UsageChip';

// Map model IDs to short display labels
const MODEL_LABELS: Record<string, string> = {
  'claude-fable-5':            'Fable 5',
  'claude-opus-4-8':           'Opus 4.8',
  'claude-sonnet-4-6':         'Sonnet 4.6',
  'claude-haiku-4-5-20251001': 'Haiku 4.5',
};

export function ChatView() {
  const { sessionId } = useParams<{ sessionId?: string }>();
  const activeSessionId = sessionId ?? 'new';
  const navigate = useNavigate();
  const bottomRef = useRef<HTMLDivElement>(null);
  const currentMsgIdRef = useRef<string | null>(null);
  const activeSessionIdRef = useRef(activeSessionId);
  activeSessionIdRef.current = activeSessionId;

  const { defaultModel, defaultEffort } = useSettingsStore();

  // Model/effort owned here so they're visible in the header; init from user defaults
  const [model, setModel] = useState<string | undefined>(defaultModel);
  const [effort, setEffort] = useState<string | undefined>(defaultEffort);

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
          thinking: m.thinking,
          // Convert HistoryToolCall[] → ToolBlock[] for display
          tools: m.tools?.map((t) => ({
            id: t.id,
            name: t.name as import('@claudedeck/shared').ToolName,
            input: t.input,
            output: t.output,
            status: t.isError ? ('error' as const) : ('success' as const),
          })),
        })
      );
    }).catch(() => {});
  }, [activeSessionId]);

  useEffect(() => {
    const unsub = wsClient.onMessage((msg: ServerMessage) => {
      const sid = 'sessionId' in msg ? (msg as { sessionId: string }).sessionId : activeSessionIdRef.current;

      switch (msg.type) {
        case 'session_ready': {
          const id = newMsgId();
          currentMsgIdRef.current = id;

          const currentActiveId = activeSessionIdRef.current;
          if (sid !== currentActiveId) {
            const pending = useChatStore.getState().messages[currentActiveId] ?? [];
            pending.forEach((pm) => useChatStore.getState().addMessage(sid, pm));
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
    // stable WS listener — navigate, setSessions and store actions are stable references
    // eslint-disable-next-line -- react-hooks/exhaustive-deps not configured
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, isStreaming]);

  const handleSend = useCallback(
    (content: string) => {
      addMessage(activeSessionId, { id: newMsgId(), role: 'user', content });
      wsClient.send({ type: 'send_message', sessionId: activeSessionId, content, model, effort });
    },
    [activeSessionId, addMessage, model, effort]
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

  const modelLabel = model ? MODEL_LABELS[model] ?? model : null;
  const usage = useUsage();

  return (
    <div className="flex h-full flex-col">
      {/* Status bar — model/effort + usage */}
      <div className="flex items-center gap-2 border-b border-border bg-muted/20 px-4 py-1.5">
        <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wider shrink-0">Chat:</span>
        <span className={cn(
          'flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium',
          model ? 'bg-primary/10 text-primary' : 'text-muted-foreground'
        )}>
          <Cpu className="h-2.5 w-2.5" />
          {modelLabel ?? 'Default · Sonnet 4.6'}
        </span>
        <span className={cn(
          'flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium',
          effort ? 'bg-primary/10 text-primary' : 'text-muted-foreground'
        )}>
          <Zap className="h-2.5 w-2.5" />
          Effort · {effort ?? 'Default'}
        </span>

        {(usage?.fiveHour || usage?.sevenDay) && (
          <>
            <span className="text-border mx-1 select-none">|</span>
            <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wider shrink-0 flex items-center gap-1">
              <Activity className="h-2.5 w-2.5" />
              Usage:
            </span>
            {usage.fiveHour && (
              <UsageChip label="5h" utilization={usage.fiveHour.utilization} />
            )}
            {usage.sevenDay && (
              <UsageChip label="7d" utilization={usage.sevenDay.utilization} />
            )}
          </>
        )}
      </div>

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
        model={model}
        effort={effort}
        onModelChange={setModel}
        onEffortChange={setEffort}
      />
    </div>
  );
}
