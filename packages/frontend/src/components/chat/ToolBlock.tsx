import { useState } from 'react';
import { ChevronDown, ChevronRight, Terminal, FileText, Pencil, Search, Globe, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ToolBlock as ToolBlockType } from '@claudedeck/shared';

const TOOL_ICONS: Record<string, React.ElementType> = {
  Bash: Terminal,
  Read: FileText,
  Write: FileText,
  Edit: Pencil,
  MultiEdit: Pencil,
  Grep: Search,
  Glob: Search,
  WebFetch: Globe,
  WebSearch: Globe,
};

const STATUS_STYLES = {
  running: 'border-l-blue-400    bg-blue-50    dark:bg-blue-500/5',
  success: 'border-l-emerald-400 bg-emerald-50 dark:bg-emerald-500/5',
  error:   'border-l-red-400     bg-red-50     dark:bg-red-500/5',
};

const SECTION_LABEL = 'text-[10px] uppercase tracking-wider font-semibold mb-1';
const SECTION_LABEL_NORMAL = cn(SECTION_LABEL, 'text-muted-foreground/70');
const SECTION_LABEL_ERROR  = cn(SECTION_LABEL, 'text-red-600 dark:text-red-400/70');

function ToolIcon({ name }: { name: string }) {
  const Icon = TOOL_ICONS[name] ?? Terminal;
  return <Icon className="h-3.5 w-3.5 shrink-0" />;
}

function formatToolInput(name: string, input: unknown): string {
  if (!input || typeof input !== 'object') return '';
  const inp = input as Record<string, unknown>;
  if (name === 'Bash') return String(inp.command ?? '');
  if (name === 'Read') return String(inp.file_path ?? '');
  if (name === 'Write') return String(inp.file_path ?? '');
  if (name === 'Edit' || name === 'MultiEdit') return String(inp.file_path ?? '');
  if (name === 'Grep') return `${inp.pattern} in ${inp.path ?? '.'}`;
  if (name === 'Glob') return String(inp.pattern ?? '');
  if (name === 'WebFetch') return String(inp.url ?? '');
  if (name === 'WebSearch') return String(inp.query ?? '');
  return JSON.stringify(input, null, 2).slice(0, 200);
}

interface Props {
  tool: ToolBlockType;
}

export function ToolBlock({ tool }: Props) {
  const [open, setOpen] = useState(false);
  const summary = formatToolInput(tool.name, tool.input);
  const statusStyle = STATUS_STYLES[tool.status] ?? STATUS_STYLES.running;

  return (
    <div className={cn('mb-1.5 overflow-hidden rounded-lg border-l-2 text-xs font-mono', statusStyle)}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
      >
        <StatusIcon status={tool.status} />
        <ToolIcon name={tool.name} />
        <span className="font-semibold text-foreground">{tool.name}</span>
        {summary && (
          <span className="truncate text-muted-foreground font-normal">{summary}</span>
        )}
        <span className="ml-auto text-muted-foreground/50">
          {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </span>
      </button>

      {open && (
        <div className="border-t border-black/5 dark:border-white/5 px-3 py-2.5 space-y-2">
          {Boolean(tool.input) && (
            <div>
              <div className={SECTION_LABEL_NORMAL}>Input</div>
              <pre className="overflow-x-auto whitespace-pre-wrap break-words text-foreground text-[11px]">
                {typeof tool.input === 'object'
                  ? JSON.stringify(tool.input as Record<string, unknown>, null, 2)
                  : String(tool.input as string)}
              </pre>
            </div>
          )}
          {tool.output && (
            <div>
              <div className={tool.status === 'error' ? SECTION_LABEL_ERROR : SECTION_LABEL_NORMAL}>
                Output
              </div>
              <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap break-words text-foreground text-[11px]">
                {tool.output}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatusIcon({ status }: { status: ToolBlockType['status'] }) {
  if (status === 'running') return <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-blue-500 dark:text-blue-400" />;
  if (status === 'success') return <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />;
  return <XCircle className="h-3.5 w-3.5 shrink-0 text-red-600 dark:text-red-400" />;
}
