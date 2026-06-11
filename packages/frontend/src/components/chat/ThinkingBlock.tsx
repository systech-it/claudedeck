import { useState } from 'react';
import { ChevronDown, ChevronRight, Brain } from 'lucide-react';

interface Props {
  text: string;
}

export function ThinkingBlock({ text }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="my-2 rounded-md border border-border/40 bg-muted/20 text-xs">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-muted-foreground hover:text-foreground"
      >
        <Brain className="h-3.5 w-3.5 text-purple-400" />
        <span className="italic">Thinking</span>
        <span className="ml-auto">
          {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </span>
      </button>
      {open && (
        <div className="border-t border-border/40 px-3 py-2 text-muted-foreground">
          <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap font-sans text-xs leading-relaxed">
            {text}
          </pre>
        </div>
      )}
    </div>
  );
}
