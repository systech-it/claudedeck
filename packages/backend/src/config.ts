import { config as loadDotenv } from 'dotenv';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

loadDotenv();

const __dirname = dirname(fileURLToPath(import.meta.url));

function readVersion(): string {
  try {
    const versionFile = resolve(__dirname, '../../../VERSION');
    return readFileSync(versionFile, 'utf-8').trim();
  } catch {
    return '0.0.0';
  }
}

function requireEnv(name: string, fallback?: string): string {
  const val = process.env[name] ?? fallback;
  if (!val) throw new Error(`Missing required environment variable: ${name}`);
  return val;
}

export const config = {
  port: parseInt(process.env.PORT ?? '3000', 10),
  host: process.env.HOST ?? '0.0.0.0',
  nodeEnv: process.env.NODE_ENV ?? 'development',

  jwtSecret: requireEnv('JWT_SECRET', 'dev-secret-change-in-production'),
  jwtExpiresIn: '8h',

  dataDir: process.env.DATA_DIR ?? './data',
  claudeBin: process.env.CLAUDE_BIN ?? 'claude',

  githubOwner: process.env.GITHUB_OWNER ?? 'systech-it',
  githubRepo: process.env.GITHUB_REPO ?? 'claudedeck',
  githubToken: process.env.GITHUB_TOKEN,

  singleUserMode: process.env.SINGLE_USER_MODE === 'true',
  corsOrigins: process.env.CORS_ORIGINS?.split(',').map((o) => o.trim()) ?? [],

  version: readVersion(),

  get isDev() {
    return this.nodeEnv === 'development';
  },
  get isProd() {
    return this.nodeEnv === 'production';
  },
};
