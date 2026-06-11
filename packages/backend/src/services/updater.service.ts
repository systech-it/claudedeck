import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import semver from 'semver';
import { config } from '../config.js';
import type { VersionInfo } from '@claudedeck/shared';
import { UPDATE_CHECK_INTERVAL_MS } from '@claudedeck/shared';

const __dirname = dirname(fileURLToPath(import.meta.url));

let cachedVersionInfo: VersionInfo | null = null;
let checkInterval: ReturnType<typeof setInterval> | null = null;

export function getCurrentVersion(): string {
  return config.version;
}

export function getCachedVersionInfo(): VersionInfo {
  if (cachedVersionInfo) return cachedVersionInfo;
  return {
    current: config.version,
    updateAvailable: false,
  };
}

export async function checkForUpdates(): Promise<VersionInfo> {
  const current = config.version;

  try {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': `ClaudeDeck/${current}`,
    };

    if (config.githubToken) {
      headers['Authorization'] = `token ${config.githubToken}`;
    }

    const url = `https://api.github.com/repos/${config.githubOwner}/${config.githubRepo}/releases/latest`;
    const res = await fetch(url, { headers });

    if (!res.ok) {
      throw new Error(`GitHub API returned ${res.status}`);
    }

    const data = (await res.json()) as {
      tag_name: string;
      html_url: string;
      body: string;
    };

    const latest = data.tag_name.replace(/^v/, '');
    const updateAvailable = semver.gt(latest, current);

    cachedVersionInfo = {
      current,
      latest,
      updateAvailable,
      releaseUrl: data.html_url,
      releaseNotes: data.body,
      checkedAt: Date.now(),
    };
  } catch (err) {
    console.warn('[updater] Failed to check for updates:', (err as Error).message);
    cachedVersionInfo = {
      current,
      updateAvailable: false,
      checkedAt: Date.now(),
    };
  }

  return cachedVersionInfo!;
}

export function startUpdateChecker(): void {
  checkForUpdates().catch(() => {});

  checkInterval = setInterval(() => {
    checkForUpdates().catch(() => {});
  }, UPDATE_CHECK_INTERVAL_MS);
}

export function stopUpdateChecker(): void {
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
  }
}
