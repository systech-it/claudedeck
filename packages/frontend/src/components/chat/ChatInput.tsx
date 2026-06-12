import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Square, ChevronUp, Cpu, Zap, Check, ShieldCheck, Paperclip, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface Attachment {
  name: string;
  mimeType: string;
  data: string;       // base64 (no prefix)
  preview?: string;   // data URL for image preview
}

interface ModelOption {
  id: string | undefined;
  label: string;
  sublabel: string;
  desc: string;
}

export const MODELS: ModelOption[] = [
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

export const EFFORTS: EffortOption[] = [
  { id: undefined,  label: 'Default', desc: 'Auto-selected by Claude'              },
  { id: 'low',      label: 'Low',     desc: 'Minimal reasoning, faster'             },
  { id: 'medium',   label: 'Medium',  desc: 'Balanced reasoning'                    },
  { id: 'high',     label: 'High',    desc: 'More thorough, slower'                 },
  { id: 'xhigh',    label: 'XHigh',   desc: 'Extended reasoning'                    },
  { id: 'max',      label: 'Max',     desc: 'Maximum reasoning, uses most tokens'   },
];

interface ModeOption {
  id: string;
  label: string;
  desc: string;
}

export const MODES: ModeOption[] = [
  { id: 'default',      label: 'Ask',        desc: 'Ask before making edits' },
  { id: 'acceptEdits',  label: 'Auto-edit',  desc: 'Edit files automatically without asking' },
  { id: 'plan',         label: 'Plan',       desc: 'Plan only — no edits made' },
  { id: 'auto',         label: 'Auto',       desc: 'Automatically choose the best permission level' },
];

// Efforts available per model — Haiku doesn't support extended thinking
const MODEL_EFFORT_IDS: Record<string, Array<string | undefined>> = {
  'default':                    [undefined, 'low', 'medium', 'high'],
  'claude-fable-5':             [undefined, 'low', 'medium', 'high', 'xhigh', 'max'],
  'claude-opus-4-8':            [undefined, 'low', 'medium', 'high', 'xhigh', 'max'],
  'claude-sonnet-4-6':          [undefined, 'low', 'medium', 'high'],
  'claude-haiku-4-5-20251001':  [undefined],
};

function getEffortsForModel(modelId: string | undefined): EffortOption[] {
  const allowed = MODEL_EFFORT_IDS[modelId ?? 'default'] ?? MODEL_EFFORT_IDS['default'];
  return EFFORTS.filter((e) => allowed.includes(e.id));
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

async function fileToAttachment(file: File): Promise<Attachment | null> {
  if (file.size > MAX_FILE_SIZE) return null;
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const [prefix, data] = dataUrl.split(',');
      const mimeType = prefix.replace('data:', '').replace(';base64', '');
      resolve({
        name: file.name,
        mimeType,
        data,
        preview: mimeType.startsWith('image/') ? dataUrl : undefined,
      });
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

interface Props {
  onSend: (content: string, attachments: Attachment[]) => void;
  onStop: () => void;
  isStreaming: boolean;
  disabled?: boolean;
  model: string | undefined;
  effort: string | undefined;
  permissionMode: string;
  onModelChange: (m: string | undefined) => void;
  onEffortChange: (e: string | undefined) => void;
  onPermissionModeChange: (m: string) => void;
}

export function ChatInput({
  onSend, onStop, isStreaming, disabled,
  model, effort, permissionMode,
  onModelChange, onEffortChange, onPermissionModeChange,
}: Props) {
  const [value, setValue] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [showModels, setShowModels] = useState(false);
  const [showEfforts, setShowEfforts] = useState(false);
  const [showModes, setShowModes] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback(async (files: FileList | File[]) => {
    const arr = Array.from(files);
    const results = await Promise.all(arr.map(fileToAttachment));
    setAttachments((prev) => [...prev, ...results.filter(Boolean) as Attachment[]]);
  }, []);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const imageItems = Array.from(items).filter((i) => i.kind === 'file' && i.type.startsWith('image/'));
    if (imageItems.length === 0) return;
    e.preventDefault();
    const files = imageItems.map((i) => i.getAsFile()).filter(Boolean) as File[];
    addFiles(files);
  }, [addFiles]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const availableEfforts = getEffortsForModel(model);
  const effortSupported = availableEfforts.length > 1;

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`;
  }, [value]);

  useEffect(() => {
    if (!showModels && !showEfforts && !showModes) return;
    const handler = () => { setShowModels(false); setShowEfforts(false); setShowModes(false); };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [showModels, showEfforts, showModes]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleSend() {
    const trimmed = value.trim();
    if ((!trimmed && attachments.length === 0) || isStreaming || disabled) return;
    onSend(trimmed || ' ', attachments);
    setValue('');
    setAttachments([]);
  }

  const activeModel = MODELS.find((m) => m.id === model) ?? MODELS[0];
  const activeEffort = EFFORTS.find((e) => e.id === effort) ?? EFFORTS[0];
  const activeMode = MODES.find((m) => m.id === permissionMode) ?? MODES[0];
  const modelIsDefault = model === undefined;
  const effortIsDefault = effort === undefined;
  const modeIsDefault = permissionMode === 'default';

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
                  onClick={() => {
                    onModelChange(m.id);
                    const newEfforts = getEffortsForModel(m.id);
                    if (effort && !newEfforts.some(e => e.id === effort)) {
                      onEffortChange(undefined);
                    }
                    setShowModels(false);
                  }}
                  className={cn(
                    'flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-accent',
                    isSelected && 'bg-accent/60'
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{m.label}</span>
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
            {availableEfforts.map((ef) => {
              const isSelected = ef.id === effort;
              return (
                <button
                  key={ef.id ?? '_default'}
                  onClick={() => { onEffortChange(ef.id); setShowEfforts(false); }}
                  className={cn(
                    'flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-accent',
                    isSelected && 'bg-accent/60'
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground">{ef.label}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground leading-snug">{ef.desc}</div>
                  </div>
                  {isSelected && <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />}
                </button>
              );
            })}
          </div>
        )}

        {/* Mode picker popup */}
        {showModes && (
          <div
            className="absolute bottom-full left-56 mb-2 z-50 w-64 rounded-xl border border-border bg-popover shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-border px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Permission mode
            </div>
            {MODES.map((m) => {
              const isSelected = m.id === permissionMode;
              return (
                <button
                  key={m.id}
                  onClick={() => { onPermissionModeChange(m.id); setShowModes(false); }}
                  className={cn(
                    'flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-accent',
                    isSelected && 'bg-accent/60'
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground">{m.label}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground leading-snug">{m.desc}</div>
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
              onClick={(e) => { e.stopPropagation(); setShowModels((p) => !p); setShowEfforts(false); setShowModes(false); }}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors border',
                !modelIsDefault
                  ? 'border-primary/40 bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              <Cpu className="h-3 w-3" />
              <span>
                {modelIsDefault
                  ? `Default · ${activeModel.sublabel}`
                  : `${activeModel.label} · ${activeModel.sublabel}`}
              </span>
              <ChevronUp className={cn('h-3 w-3 opacity-60 transition-transform', showModels && 'rotate-180')} />
            </button>

            <button
              onClick={(e) => { if (!effortSupported) return; e.stopPropagation(); setShowEfforts((p) => !p); setShowModels(false); setShowModes(false); }}
              disabled={!effortSupported}
              title={!effortSupported ? 'Haiku does not support extended thinking' : undefined}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors border',
                !effortSupported
                  ? 'border-border/40 text-muted-foreground/40 cursor-not-allowed'
                  : !effortIsDefault
                    ? 'border-primary/40 bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              <Zap className="h-3 w-3" />
              <span>{!effortSupported ? 'No thinking' : `Effort · ${activeEffort.label}`}</span>
              {effortSupported && <ChevronUp className={cn('h-3 w-3 opacity-60 transition-transform', showEfforts && 'rotate-180')} />}
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); setShowModes((p) => !p); setShowModels(false); setShowEfforts(false); }}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors border',
                !modeIsDefault
                  ? 'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                  : 'border-border text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              <ShieldCheck className="h-3 w-3" />
              <span>Mode · {activeMode.label}</span>
              <ChevronUp className={cn('h-3 w-3 opacity-60 transition-transform', showModes && 'rotate-180')} />
            </button>


          </div>

          {/* Attachment previews */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 px-1">
              {attachments.map((att, i) => (
                <div key={i} className="relative group/att">
                  {att.preview ? (
                    <img
                      src={att.preview}
                      alt={att.name}
                      className="h-14 w-14 rounded-lg object-cover border border-border"
                    />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-border bg-muted text-[10px] text-muted-foreground text-center px-1 overflow-hidden">
                      {att.name}
                    </div>
                  )}
                  <button
                    onClick={() => setAttachments((prev) => prev.filter((_, j) => j !== i))}
                    className="absolute -top-1.5 -right-1.5 hidden group-hover/att:flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-white"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Input row */}
          <div className="flex items-stretch gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf,.txt,.md,.json,.csv,.js,.ts,.py"
              className="hidden"
              onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ''; }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center w-10 shrink-0 rounded-xl border border-input bg-input text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              title="Attach file"
              type="button"
            >
              <Paperclip className="h-4 w-4" />
            </button>

            <div
              className="flex flex-1 items-end gap-2 rounded-xl border border-input bg-input focus-within:border-ring focus-within:ring-1 focus-within:ring-ring transition-shadow"
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
            >
              <textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                placeholder="Message Claude Code… (Enter to send, Shift+Enter for newline)"
                disabled={isStreaming || disabled}
                rows={1}
                className="max-h-[200px] min-h-[44px] flex-1 resize-none bg-transparent px-3 py-3 text-sm placeholder:text-muted-foreground focus:outline-none disabled:opacity-50"
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
                    disabled={(!value.trim() && attachments.length === 0) || disabled}
                    title="Send message"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                )}
              </div>
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
