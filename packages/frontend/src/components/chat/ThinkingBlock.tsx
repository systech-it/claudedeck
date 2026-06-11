import { useState } from 'react';
import { ChevronDown, ChevronRight, Brain } from 'lucide-react';

interface Props {
  text: string;
}

export function ThinkingBlock({ text }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-2 overflow-hidden rounded-lg border-l-2 border-violet-400/60 bg-violet-50 dark:bg-violet-500/5">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-violet-100/60 dark:hover:bg-violet-500/5 transition-colors"
      >
        <Brain className="h-2.5 w-2.5 shrink-0 text-violet-500 dark:text-violet-400" />
        <span className="text-[10px] italic font-medium text-violet-700 dark:text-violet-300/80">
          Internal reasoning
        </span>
        <span className="ml-1.5 text-[10px] text-violet-500/60 dark:text-violet-400/50 font-normal not-italic">
          — {text.length.toLocaleString()} chars
        </span>
        <span className="ml-auto text-violet-400/60 dark:text-violet-400/50">
          {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </span>
      </button>
      {open && (
        <div className="border-t border-violet-200 dark:border-violet-400/20 px-3 py-2.5">
          <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-violet-800/80 dark:text-violet-200/60">
            {text}
          </pre>
        </div>
      )}
    </div>
  );
}
