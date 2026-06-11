import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';
import { Bot, User, DollarSign, Brain } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ToolBlock } from './ToolBlock';
import { ThinkingBlock } from './ThinkingBlock';
import type { ChatMessage } from '@/stores/chat.store';

const CHARS_PER_FRAME = 4;

interface Props {
  message: ChatMessage;
}

export function Message({ message }: Props) {
  const isUser = message.role === 'user';

  const [displayedContent, setDisplayedContent] = useState(
    message.isStreaming ? '' : message.content
  );
  const targetRef = useRef(message.content);
  targetRef.current = message.content;

  useEffect(() => {
    if (!message.isStreaming) {
      setDisplayedContent(message.content);
      return;
    }
    if (!message.content) return;
    let rafId: number;
    const tick = () => {
      setDisplayedContent((prev) => {
        const target = targetRef.current;
        if (prev.length >= target.length) return prev;
        return target.slice(0, prev.length + CHARS_PER_FRAME);
      });
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [message.isStreaming, message.content]);

  const contentToShow = message.isStreaming ? displayedContent : message.content;
  const showThinkingIndicator = message.isStreaming && !message.content;
  const showCursor = message.isStreaming && !!contentToShow;
  const hasTools = message.tools && message.tools.length > 0;
  const hasThinking = !!message.thinking;

  return (
    <div className={cn('group flex gap-2.5 px-4 py-2', isUser ? 'flex-row-reverse' : 'flex-row')}>
      {/* Avatar */}
      <div className={cn(
        'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
        isUser
          ? 'bg-primary/20 text-primary'
          : 'bg-gradient-to-br from-orange-500/30 to-amber-600/20 text-orange-400'
      )}>
        {isUser ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
      </div>

      <div className={cn('min-w-0 max-w-[85%] flex flex-col gap-1.5', isUser ? 'items-end' : 'items-start')}>

        {/* ── WORKFLOW (thinking + tools) — subtle, secondary ── */}
        {!isUser && (hasThinking || hasTools) && (
          <div className="w-full border-l-2 border-border/40 pl-3 space-y-1 opacity-70 hover:opacity-100 transition-opacity">
            {hasThinking && <ThinkingBlock text={message.thinking!} />}
            {message.tools?.map((tool) => <ToolBlock key={tool.id} tool={tool} />)}
          </div>
        )}

        {/* Thinking indicator (waiting for first token) */}
        {showThinkingIndicator && (
          <div className="w-full flex items-center gap-2 rounded-lg border border-border/40 bg-muted/20 px-3 py-2">
            <Brain className="h-3.5 w-3.5 shrink-0 animate-pulse text-violet-400" />
            <span className="text-[11px] animate-pulse text-muted-foreground">
              {message.thinkingTokens
                ? `Thinking… ${message.thinkingTokens.toLocaleString()} tokens`
                : 'Thinking…'}
            </span>
            <span className="ml-auto flex gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:0ms]" />
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:150ms]" />
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:300ms]" />
            </span>
          </div>
        )}

        {/* ── RESPONSE BUBBLE — the actual chat message ── */}
        {contentToShow && (
          <div className={cn(
            'rounded-2xl px-3.5 py-2.5',
            isUser
              ? 'bg-primary/15 rounded-tr-sm'
              : 'bg-muted/60 rounded-tl-sm'
          )}>
            <div className="prose prose-sm max-w-none text-foreground">
              <ReactMarkdown
                rehypePlugins={[rehypeHighlight]}
                components={{
                  p: ({ children }) => (
                    <p className="mb-2 last:mb-0 text-[11px] leading-relaxed text-foreground">{children}</p>
                  ),
                  ul: ({ children }) => <ul className="mb-2 pl-4 text-[11px]">{children}</ul>,
                  ol: ({ children }) => <ol className="mb-2 pl-4 text-[11px]">{children}</ol>,
                  li: ({ children }) => <li className="mb-0.5 text-[11px] leading-relaxed text-foreground">{children}</li>,
                  h1: ({ children }) => <h1 className="text-sm font-bold mb-2 text-foreground">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-xs font-bold mb-1.5 text-foreground">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-[11px] font-bold mb-1 text-foreground">{children}</h3>,
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-2 border-primary/40 pl-3 text-[11px] text-muted-foreground my-2">
                      {children}
                    </blockquote>
                  ),
                  code({ node: _node, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '');
                    const isBlock = match || String(children).includes('\n');
                    if (isBlock) {
                      return (
                        <div className="relative my-2 overflow-hidden rounded-lg border border-border/60 bg-background/80">
                          {match && (
                            <div className="flex items-center justify-between border-b border-border/40 bg-muted/40 px-3 py-1">
                              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                                {match[1]}
                              </span>
                            </div>
                          )}
                          <pre className="overflow-x-auto p-3">
                            <code className={cn(className, 'text-[11px] font-mono leading-relaxed')} {...props}>
                              {children}
                            </code>
                          </pre>
                        </div>
                      );
                    }
                    return (
                      <code
                        className="rounded-md bg-muted/80 border border-border/40 px-1 py-0.5 font-mono text-[10px] text-foreground"
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {contentToShow}
              </ReactMarkdown>
              {showCursor && (
                <span className="inline-block h-3.5 w-0.5 bg-foreground/70 animate-pulse align-middle ml-0.5" />
              )}
            </div>
          </div>
        )}

        {/* Cost / usage metadata */}
        {!isUser && (message.costUsd !== undefined || message.durationMs !== undefined) && (
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground/40 px-1">
            {message.costUsd !== undefined && (
              <span className="flex items-center gap-0.5">
                <DollarSign className="h-2.5 w-2.5" />
                {message.costUsd.toFixed(4)}
              </span>
            )}
            {message.durationMs !== undefined && (
              <span>{(message.durationMs / 1000).toFixed(1)}s</span>
            )}
            {message.usage && (
              <span>
                {message.usage.inputTokens.toLocaleString()} in /{' '}
                {message.usage.outputTokens.toLocaleString()} out
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
