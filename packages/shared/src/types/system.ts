export interface VersionInfo {
  current: string;
  latest?: string;
  updateAvailable: boolean;
  releaseUrl?: string;
  releaseNotes?: string;
  checkedAt?: number;
}

export interface SystemInfo {
  version: string;
  nodeVersion: string;
  platform: string;
  claudeBinPath: string;
  claudeVersion?: string;
  dataDir: string;
  userCount: number;
  sessionCount: number;
}
