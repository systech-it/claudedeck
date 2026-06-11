import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';
import { Bot, User, DollarSign, Brain } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ToolBlock } from './ToolBlock';
import { ThinkingBlock } from './ThinkingBlock';
import type { ChatMessage } from '@/stores/chat.store';

// characters revealed per animation frame (~60fps → ~240 chars/s)
const CHARS_PER_FRAME = 4;

interface Props {
  message: ChatMessage;
}

export function Message({ message }: Props) {
  const isUser = message.role === 'user';

  // Start empty while streaming so we can animate; jump to full when done
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

    // Animate from current length toward full content
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
  // Show thinking indicator while waiting for first content
  const showThinkingIndicator = message.isStreaming && !message.content;
  // Show blinking cursor while text is still being revealed
  const showCursor = message.isStreaming && !!contentToShow;

  return (
    <div className={cn('group flex gap-3 px-4 py-3', isUser ? 'flex-row-reverse' : 'flex-row')}>
      <div
        className={cn(
          'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
          isUser ? 'bg-primary/20 text-primary' : 'bg-secondary text-secondary-foreground'
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      <div className={cn('min-w-0 max-w-[80%]', isUser ? 'items-end' : 'items-start')}>
        {message.thinking && <ThinkingBlock text={message.thinking} />}

        {message.tools?.map((tool) => <ToolBlock key={tool.id} tool={tool} />)}

        {/* Thinking / waiting indicator */}
        {showThinkingIndicator && (
          <div className="flex items-center gap-2 rounded-lg bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
            <Brain className="h-4 w-4 shrink-0 animate-pulse text-primary/70" />
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

        {contentToShow && (
          <div
            className={cn(
              'prose prose-sm prose-invert max-w-none rounded-lg px-4 py-3',
              isUser ? 'bg-primary/10 text-foreground' : 'bg-muted/50 text-foreground'
            )}
          >
            <ReactMarkdown
              rehypePlugins={[rehypeHighlight]}
              components={{
                code({ node: _node, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '');
                  const isBlock = match || String(children).includes('\n');
                  if (isBlock) {
                    return (
                      <div className="relative my-2 overflow-hidden rounded-md border border-border/50 bg-background/80">
                        {match && (
                          <div className="border-b border-border/50 px-3 py-1 text-xs text-muted-foreground">
                            {match[1]}
                          </div>
                        )}
                        <pre className="overflow-x-auto p-3">
                          <code className={className} {...props}>
                            {children}
                          </code>
                        </pre>
                      </div>
                    );
                  }
                  return (
                    <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs" {...props}>
                      {children}
                    </code>
                  );
                },
              }}
            >
              {contentToShow}
            </ReactMarkdown>
            {showCursor && (
              <span className="inline-block h-4 w-0.5 bg-foreground/70 animate-pulse align-middle ml-0.5" />
            )}
          </div>
        )}

        {!isUser && (message.costUsd !== undefined || message.durationMs !== undefined) && (
          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground/60">
            {message.costUsd !== undefined && (
              <span className="flex items-center gap-0.5">
                <DollarSign className="h-3 w-3" />
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
