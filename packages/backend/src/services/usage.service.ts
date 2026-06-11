import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export interface UsageData {
  fiveHour: { utilization: number; resetAt: number } | null;
  sevenDay: { utilization: number; resetAt: number } | null;
  fetchedAt: number;
}

let cache: UsageData | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minut

function readOAuthToken(): string | null {
  const credPath = join(process.env.HOME ?? '/root', '.claude', '.credentials.json');
  if (!existsSync(credPath)) return null;
  try {
    const d = JSON.parse(readFileSync(credPath, 'utf-8'));
    return d?.claudeAiOauth?.accessToken ?? null;
  } catch {
    return null;
  }
}

export async function fetchUsage(): Promise<UsageData> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) return cache;

  const token = readOAuthToken();
  if (!token) {
    cache = { fiveHour: null, sevenDay: null, fetchedAt: Date.now() };
    return cache;
  }

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'hi' }],
      }),
    });

    const h5util = res.headers.get('anthropic-ratelimit-unified-5h-utilization');
    const h5reset = res.headers.get('anthropic-ratelimit-unified-5h-reset');
    const h7util = res.headers.get('anthropic-ratelimit-unified-7d-utilization');
    const h7reset = res.headers.get('anthropic-ratelimit-unified-7d-reset');

    cache = {
      fiveHour: h5util ? { utilization: parseFloat(h5util), resetAt: parseInt(h5reset ?? '0') * 1000 } : null,
      sevenDay: h7util ? { utilization: parseFloat(h7util), resetAt: parseInt(h7reset ?? '0') * 1000 } : null,
      fetchedAt: Date.now(),
    };
  } catch {
    cache = { fiveHour: null, sevenDay: null, fetchedAt: Date.now() };
  }

  return cache;
}

export function updateUsageFromHeaders(headers: Headers): void {
  const h5util = headers.get('anthropic-ratelimit-unified-5h-utilization');
  const h5reset = headers.get('anthropic-ratelimit-unified-5h-reset');
  const h7util = headers.get('anthropic-ratelimit-unified-7d-utilization');
  const h7reset = headers.get('anthropic-ratelimit-unified-7d-reset');
  if (!h5util && !h7util) return;
  cache = {
    fiveHour: h5util ? { utilization: parseFloat(h5util), resetAt: parseInt(h5reset ?? '0') * 1000 } : (cache?.fiveHour ?? null),
    sevenDay: h7util ? { utilization: parseFloat(h7util), resetAt: parseInt(h7reset ?? '0') * 1000 } : (cache?.sevenDay ?? null),
    fetchedAt: Date.now(),
  };
}
