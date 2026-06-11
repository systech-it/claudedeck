import { cn } from '@/lib/utils';

interface Props {
  label: string;
  utilization: number;
}

export function UsageChip({ label, utilization }: Props) {
  const pct = Math.round(utilization * 100);
  const isWarn = utilization >= 0.7;
  const isDanger = utilization >= 0.9;

  return (
    <span className="flex items-center gap-1.5">
      <span className="text-[10px] text-muted-foreground font-medium">{label}</span>
      <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            isDanger ? 'bg-red-500' : isWarn ? 'bg-amber-500' : 'bg-primary/70'
          )}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <span className={cn(
        'text-[10px] font-semibold tabular-nums',
        isDanger ? 'text-red-500' : isWarn ? 'text-amber-500' : 'text-foreground/70'
      )}>
        {pct}%
      </span>
    </span>
  );
}
