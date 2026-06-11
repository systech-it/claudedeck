import type { Config } from 'drizzle-kit';
import { config } from 'dotenv';

config();

export default {
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: `${process.env.DATA_DIR ?? './data'}/claudedeck.db`,
  },
} satisfies Config;
