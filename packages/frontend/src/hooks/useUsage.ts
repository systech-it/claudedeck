import { useEffect, useState } from 'react';
import { api } from '@/api/http';

interface UsageWindow {
  utilization: number;
  resetAt: number;
}

export interface UsageData {
  fiveHour: UsageWindow | null;
  sevenDay: UsageWindow | null;
}

export function useUsage(): UsageData | null {
  const [usage, setUsage] = useState<UsageData | null>(null);

  useEffect(() => {
    const load = () => api.usage.get().then(setUsage).catch(() => {});
    load();
    const t = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(t);
  }, []);

  return usage;
}
