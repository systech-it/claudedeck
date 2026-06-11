import { useState, useRef, useEffect } from 'react';
import { Send, Square, ChevronUp, Cpu, Zap, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ModelOption {
  id: string | undefined;
  label: string;
  sublabel: string;
  desc: string;
}

const MODELS: ModelOption[] = [
  { id: undefined,                    label: 'Default',    sublabel: 'Sonnet 4.6',  desc: 'Efficient for routine tasks (recommended)' },
  { id: 'claude-fable-5',            label: 'Fable',      sublabel: 'Fable 5',     desc: 'Most capable · ~2× faster than Opus · uses your limits' },
  { id: 'claude-opus-4-8',           label: 'Opus',       sublabel: 'Opus 4.8',    desc: 'Best for complex everyday tasks · ~2× usage vs Sonnet' },
  { id: 'claude-haiku-4-5-20251001', label: 'Haiku',      sublabel: 'Haiku 4.5',   desc: 'Fastest for quick answers' },
];

interface EffortOption {
  id: string | undefined;
  label: string;
  desc: string;
}

const EFFORTS: EffortOption[] = [
  { id: undefined,  label: 'Default', desc: 'Auto-selected by Claude'         },
  { id: 'low',      label: 'Low',     desc: 'Minimal reasoning, faster'        },
  { id: 'medium',   label: 'Medium',  desc: 'Balanced reasoning'               },
  { id: 'high',     label: 'High',    desc: 'More thorough, slower'            },
  { id: 'xhigh',    label: 'XHigh',   desc: 'Extended reasoning'               },
  { id: 'max',      label: 'Max',     desc: 'Maximum reasoning, uses most tokens' },
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

  const activeModel = MODELS.find((m) => m.id === model) ?? MODELS[0];
  const activeEffort = EFFORTS.find((e) => e.id === effort) ?? EFFORTS[0];
  const modelActive = model !== undefined;
  const effortActive = effort !== undefined;

  return (
    <div className="border-t border-border bg-background px-4 pb-4 pt-3">
      <div className="relative">
        {/* Model picker popup */}
        {showModels && (
          <div
            className="absolute bottom-full left-0 mb-2 z-50 w-72 rounded-xl border border-border bg-popover shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-border px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Select a model
            </div>
            {MODELS.map((m) => {
              const isSelected = m.id === model;
              return (
                <button
                  key={m.id ?? '_default'}
                  onClick={() => { setModel(m.id); setShowModels(false); }}
                  className={cn(
                    'flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-accent',
                    isSelected && 'bg-accent/60'
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn('text-sm font-medium', isSelected ? 'text-foreground' : 'text-foreground/90')}>
                        {m.label}
                      </span>
                      <span className="text-xs text-muted-foreground">{m.sublabel}</span>
                      {m.id === undefined && (
                        <span className="ml-auto text-[10px] font-medium bg-primary/15 text-primary px-1.5 py-0.5 rounded-full">
                          recommended
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground leading-snug">{m.desc}</div>
                  </div>
                  {isSelected && <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />}
                </button>
              );
            })}
          </div>
        )}

        {/* Effort picker popup */}
        {showEfforts && (
          <div
            className="absolute bottom-full left-28 mb-2 z-50 w-60 rounded-xl border border-border bg-popover shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-border px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Thinking effort
            </div>
            {EFFORTS.map((ef) => {
              const isSelected = ef.id === effort;
              return (
                <button
                  key={ef.id ?? '_default'}
                  onClick={() => { setEffort(ef.id); setShowEfforts(false); }}
                  className={cn(
                    'flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-accent',
                    isSelected && 'bg-accent/60'
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className={cn('text-sm font-medium', isSelected ? 'text-foreground' : 'text-foreground/90')}>
                      {ef.label}
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground leading-snug">{ef.desc}</div>
                  </div>
                  {isSelected && <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />}
                </button>
              );
            })}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          {/* Option chips */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={(e) => { e.stopPropagation(); setShowModels((p) => !p); setShowEfforts(false); }}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors border',
                modelActive
                  ? 'border-primary/40 bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              <Cpu className="h-3 w-3" />
              <span>{modelActive ? `${activeModel.label} · ${activeModel.sublabel}` : 'Model'}</span>
              <ChevronUp className={cn('h-3 w-3 opacity-60 transition-transform', showModels && 'rotate-180')} />
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); setShowEfforts((p) => !p); setShowModels(false); }}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors border',
                effortActive
                  ? 'border-primary/40 bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              <Zap className="h-3 w-3" />
              <span>{effortActive ? `Effort · ${activeEffort.label}` : 'Effort'}</span>
              <ChevronUp className={cn('h-3 w-3 opacity-60 transition-transform', showEfforts && 'rotate-180')} />
            </button>
          </div>

          {/* Input row */}
          <div className="flex items-end gap-2 rounded-xl border border-input bg-input focus-within:border-ring focus-within:ring-1 focus-within:ring-ring transition-shadow">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message Claude Code… (Enter to send, Shift+Enter for newline)"
              disabled={isStreaming || disabled}
              rows={1}
              className="max-h-[200px] min-h-[44px] flex-1 resize-none bg-transparent px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none disabled:opacity-50"
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

      <p className="mt-1.5 text-center text-xs text-muted-foreground/40">
        ClaudeDeck by SysTech — Claude Code CLI interface
      </p>
    </div>
  );
}
