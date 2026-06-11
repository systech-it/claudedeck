import { useEffect, useState } from 'react';
import { api } from '@/api/http';
import { cn } from '@/lib/utils';

interface UsageWindow {
  utilization: number;
  resetAt: number;
}

interface Usage {
  fiveHour: UsageWindow | null;
  sevenDay: UsageWindow | null;
}

function Bar({ pct, label }: { pct: number; label: string }) {
  const color =
    pct >= 0.9 ? 'bg-red-500' :
    pct >= 0.7 ? 'bg-amber-500' :
    'bg-primary/70';

  return (
    <div className="flex items-center gap-1.5" title={`${label}: ${Math.round(pct * 100)}%`}>
      <span className="text-[9px] text-muted-foreground/60 shrink-0 w-4">{label}</span>
      <div className="w-12 h-1 rounded-full bg-muted overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', color)}
          style={{ width: `${Math.min(pct * 100, 100)}%` }}
        />
      </div>
      <span className={cn(
        'text-[9px] tabular-nums shrink-0',
        pct >= 0.9 ? 'text-red-500' : pct >= 0.7 ? 'text-amber-500' : 'text-muted-foreground/60'
      )}>
        {Math.round(pct * 100)}%
      </span>
    </div>
  );
}

export function UsageBar() {
  const [usage, setUsage] = useState<Usage | null>(null);

  useEffect(() => {
    const load = () => api.usage.get().then(setUsage).catch(() => {});
    load();
    const t = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(t);
  }, []);

  if (!usage?.fiveHour && !usage?.sevenDay) return null;

  return (
    <div className="flex items-center gap-2.5">
      {usage.fiveHour && <Bar pct={usage.fiveHour.utilization} label="5h" />}
      {usage.sevenDay && <Bar pct={usage.sevenDay.utilization} label="7d" />}
    </div>
  );
}
