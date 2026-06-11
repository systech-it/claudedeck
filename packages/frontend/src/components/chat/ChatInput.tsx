import { useState, useRef, useEffect } from 'react';
import { Send, Square, ChevronUp, Cpu, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const MODELS = [
  { id: 'claude-opus-4-8',            label: 'Opus 4'    },
  { id: 'claude-sonnet-4-6',          label: 'Sonnet 4'  },
  { id: 'claude-haiku-4-5-20251001',  label: 'Haiku 4'   },
];

const EFFORTS = [
  { id: 'low',    label: 'Low'    },
  { id: 'medium', label: 'Medium' },
  { id: 'high',   label: 'High'   },
  { id: 'max',    label: 'Max'    },
];

interface Props {
  onSend: (content: string, model?: string, effort?: string) => void;
  onStop: () => void;
  isStreaming: boolean;
  disabled?: boolean;
}

export function ChatInput({ onSend, onStop, isStreaming, disabled }: Props) {
  const [value, setValue] = useState('');
  const [model, setModel] = useState<string | undefined>(undefined);
  const [effort, setEffort] = useState<string | undefined>(undefined);
  const [showModels, setShowModels] = useState(false);
  const [showEfforts, setShowEfforts] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`;
  }, [value]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    if (!showModels && !showEfforts) return;
    const handler = () => { setShowModels(false); setShowEfforts(false); };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [showModels, showEfforts]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleSend() {
    const trimmed = value.trim();
    if (!trimmed || isStreaming || disabled) return;
    onSend(trimmed, model, effort);
    setValue('');
  }

  const activeModel = MODELS.find((m) => m.id === model);
  const activeEffort = EFFORTS.find((e) => e.id === effort);

  return (
    <div className="border-t border-border bg-background px-4 pb-4 pt-3">
      {/* Option popups — open upward */}
      <div className="relative">
        {showModels && (
          <div
            className="absolute bottom-full left-0 mb-1 z-50 min-w-[160px] rounded-lg border border-border bg-popover shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Model</div>
            {MODELS.map((m) => (
              <button
                key={m.id}
                onClick={() => { setModel(m.id === model ? undefined : m.id); setShowModels(false); }}
                className={cn(
                  'flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm transition-colors hover:bg-accent',
                  model === m.id && 'bg-accent text-accent-foreground font-medium'
                )}
              >
                {m.label}
                {model === m.id && <span className="ml-auto text-xs text-primary">✓</span>}
              </button>
            ))}
            {model && (
              <button
                onClick={() => { setModel(undefined); setShowModels(false); }}
                className="w-full rounded px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent text-left"
              >
                Reset to default
              </button>
            )}
          </div>
        )}

        {showEfforts && (
          <div
            className="absolute bottom-full left-28 mb-1 z-50 min-w-[140px] rounded-lg border border-border bg-popover shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Effort</div>
            {EFFORTS.map((ef) => (
              <button
                key={ef.id}
                onClick={() => { setEffort(ef.id === effort ? undefined : ef.id); setShowEfforts(false); }}
                className={cn(
                  'flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm transition-colors hover:bg-accent',
                  effort === ef.id && 'bg-accent text-accent-foreground font-medium'
                )}
              >
                {ef.label}
                {effort === ef.id && <span className="ml-auto text-xs text-primary">✓</span>}
              </button>
            ))}
            {effort && (
              <button
                onClick={() => { setEffort(undefined); setShowEfforts(false); }}
                className="w-full rounded px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent text-left"
              >
                Reset to default
              </button>
            )}
          </div>
        )}

        {/* Bottom bar with options + textarea + send */}
        <div className="flex flex-col gap-1.5">
          {/* Option chips */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={(e) => { e.stopPropagation(); setShowModels((p) => !p); setShowEfforts(false); }}
              className={cn(
                'flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors border',
                activeModel
                  ? 'border-primary/50 bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:bg-accent'
              )}
            >
              <Cpu className="h-3 w-3" />
              {activeModel ? activeModel.label : 'Model'}
              <ChevronUp className={cn('h-3 w-3 transition-transform', showModels && 'rotate-180')} />
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); setShowEfforts((p) => !p); setShowModels(false); }}
              className={cn(
                'flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors border',
                activeEffort
                  ? 'border-primary/50 bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:bg-accent'
              )}
            >
              <Zap className="h-3 w-3" />
              {activeEffort ? activeEffort.label : 'Effort'}
              <ChevronUp className={cn('h-3 w-3 transition-transform', showEfforts && 'rotate-180')} />
            </button>
          </div>

          {/* Input area */}
          <div className="flex items-end gap-2 rounded-lg border border-input bg-background focus-within:ring-1 focus-within:ring-ring">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message Claude Code… (Enter to send, Shift+Enter for newline)"
              disabled={isStreaming || disabled}
              rows={1}
              className={cn(
                'max-h-[200px] min-h-[44px] flex-1 resize-none bg-transparent px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none disabled:opacity-50'
              )}
            />
            <div className="p-2">
              {isStreaming ? (
                <Button size="icon" variant="destructive" onClick={onStop} title="Stop generation">
                  <Square className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  size="icon"
                  onClick={handleSend}
                  disabled={!value.trim() || disabled}
                  title="Send message"
                >
                  <Send className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <p className="mt-1.5 text-center text-xs text-muted-foreground/50">
        ClaudeDeck by SysTech — Claude Code CLI interface
      </p>
    </div>
  );
}
