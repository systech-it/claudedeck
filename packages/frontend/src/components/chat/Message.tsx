import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';
import { Bot, User, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ToolBlock } from './ToolBlock';
import { ThinkingBlock } from './ThinkingBlock';
import { Brain } from 'lucide-react';
import type { ChatMessage } from '@/stores/chat.store';

// characters revealed per animation frame (~60fps → ~240 chars/s)
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
  const hasWorkItems = message.thinking || (message.tools && message.tools.length > 0);

  return (
    <div className={cn('group flex gap-2.5 px-4 py-2', isUser ? 'flex-row-reverse' : 'flex-row')}>
      <div
        className={cn(
          'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px]',
          isUser ? 'bg-primary/20 text-primary' : 'bg-secondary text-secondary-foreground'
        )}
      >
        {isUser ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
      </div>

      <div className={cn('min-w-0 max-w-[85%]', isUser ? 'items-end' : 'items-start')}>

        {/* Work section — thinking + tools, visually distinct from response */}
        {!isUser && hasWorkItems && (
          <div className="mb-2 space-y-1 rounded-lg border border-border/40 bg-background/40 p-2">
            {message.thinking && <ThinkingBlock text={message.thinking} />}
            {message.tools?.map((tool) => <ToolBlock key={tool.id} tool={tool} />)}
          </div>
        )}

        {/* Thinking / waiting indicator */}
        {showThinkingIndicator && (
          <div className="mb-2 flex items-center gap-2 rounded-lg border border-border/40 bg-background/40 px-3 py-2 text-[11px] text-muted-foreground">
            <Brain className="h-3.5 w-3.5 shrink-0 animate-pulse text-violet-400" />
            <span className="animate-pulse">
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

        {/* Main response bubble */}
        {contentToShow && (
          <div
            className={cn(
              'rounded-lg px-3 py-2.5',
              isUser ? 'bg-primary/10 text-foreground' : 'bg-muted/50 text-foreground'
            )}
          >
            <div className="prose prose-sm max-w-none [&_*]:text-[11px] [&_*]:leading-relaxed dark:[&_p]:text-foreground dark:[&_li]:text-foreground dark:[&_td]:text-foreground">
              <ReactMarkdown
                rehypePlugins={[rehypeHighlight]}
                components={{
                  p: ({ children }) => <p className="mb-2 last:mb-0 text-[11px] leading-relaxed">{children}</p>,
                  li: ({ children }) => <li className="text-[11px] leading-relaxed">{children}</li>,
                  code({ node: _node, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '');
                    const isBlock = match || String(children).includes('\n');
                    if (isBlock) {
                      return (
                        <div className="relative my-2 overflow-hidden rounded border border-border/50 bg-background/80">
                          {match && (
                            <div className="border-b border-border/50 px-3 py-0.5 text-[10px] text-muted-foreground">
                              {match[1]}
                            </div>
                          )}
                          <pre className="overflow-x-auto p-2.5">
                            <code className={cn(className, 'text-[11px]')} {...props}>
                              {children}
                            </code>
                          </pre>
                        </div>
                      );
                    }
                    return (
                      <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]" {...props}>
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
          <div className="mt-1 flex items-center gap-3 text-[10px] text-muted-foreground/50">
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
