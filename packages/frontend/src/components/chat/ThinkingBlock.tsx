import { useState } from 'react';
import { ChevronDown, ChevronRight, Brain } from 'lucide-react';

interface Props {
  text: string;
}

export function ThinkingBlock({ text }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-2 overflow-hidden rounded-lg border-l-2 border-violet-400/60 bg-violet-500/5 text-xs">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-violet-500/5 transition-colors"
      >
        <Brain className="h-3.5 w-3.5 shrink-0 text-violet-400" />
        <span className="italic text-violet-300/80 font-medium">Internal reasoning</span>
        <span className="ml-2 text-violet-400/50 font-normal not-italic">
          — {text.length.toLocaleString()} chars
        </span>
        <span className="ml-auto text-violet-400/50">
          {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </span>
      </button>
      {open && (
        <div className="border-t border-violet-400/20 px-3 py-2.5">
          <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-violet-200/60">
            {text}
          </pre>
        </div>
      )}
    </div>
  );
}
