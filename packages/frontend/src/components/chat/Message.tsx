import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';
import { Bot, User, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ToolBlock } from './ToolBlock';
import { ThinkingBlock } from './ThinkingBlock';
import type { ChatMessage } from '@/stores/chat.store';

interface Props {
  message: ChatMessage;
}

export function Message({ message }: Props) {
  const isUser = message.role === 'user';

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

        {message.content && (
          <div
            className={cn(
              'prose prose-sm prose-invert max-w-none rounded-lg px-4 py-3',
              isUser
                ? 'bg-primary/10 text-foreground'
                : 'bg-muted/50 text-foreground'
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
                    <code
                      className="rounded bg-muted px-1 py-0.5 font-mono text-xs"
                      {...props}
                    >
                      {children}
                    </code>
                  );
                },
              }}
            >
              {message.content}
            </ReactMarkdown>
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
