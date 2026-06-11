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

function ToolIcon({ name }: { name: string }) {
  const Icon = TOOL_ICONS[name] ?? Terminal;
  return <Icon className="h-3.5 w-3.5" />;
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

  return (
    <div className="my-1 rounded-md border border-border/50 bg-muted/30 text-xs font-mono">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-muted-foreground hover:text-foreground"
      >
        <StatusIcon status={tool.status} />
        <ToolIcon name={tool.name} />
        <span className="font-semibold text-foreground">{tool.name}</span>
        {summary && (
          <span className="truncate text-muted-foreground">{summary}</span>
        )}
        <span className="ml-auto">
          {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </span>
      </button>

      {open && (
        <div className="border-t border-border/50 px-3 py-2">
          {tool.input && (
            <div className="mb-2">
              <div className="mb-1 text-muted-foreground">Input</div>
              <pre className="overflow-x-auto whitespace-pre-wrap break-words text-foreground">
                {typeof tool.input === 'object'
                  ? JSON.stringify(tool.input, null, 2)
                  : String(tool.input)}
              </pre>
            </div>
          )}
          {tool.output && (
            <div>
              <div className={cn('mb-1', tool.status === 'error' ? 'text-destructive' : 'text-muted-foreground')}>
                Output
              </div>
              <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap break-words text-foreground">
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
  if (status === 'running') return <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-400" />;
  if (status === 'success') return <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />;
  return <XCircle className="h-3.5 w-3.5 text-destructive" />;
}
