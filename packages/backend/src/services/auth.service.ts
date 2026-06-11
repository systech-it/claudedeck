import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../db/index.js';
import { users, type DbUser } from '../db/schema.js';
import type { RegisterRequest } from '@claudedeck/shared';
import { mkdirSync } from 'fs';
import { join } from 'path';
import { config } from '../config.js';

const SALT_ROUNDS = 12;

export async function createUser(data: RegisterRequest): Promise<DbUser> {
  const existing = db.select().from(users).where(eq(users.username, data.username)).get();
  if (existing) throw new Error('Username already taken');

  const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);
  const id = nanoid();
  const now = Date.now();

  const isFirstUser = db.select().from(users).all().length === 0;

  const user: DbUser = {
    id,
    username: data.username,
    passwordHash,
    anthropicApiKey: data.anthropicApiKey,
    isAdmin: isFirstUser,
    createdAt: now,
  };

  db.insert(users).values(user).run();

  mkdirSync(getUserProfileDir(id), { recursive: true });

  return user;
}

export async function verifyUser(username: string, password: string): Promise<DbUser | null> {
  const user = db.select().from(users).where(eq(users.username, username)).get();
  if (!user) return null;

  const valid = await bcrypt.compare(password, user.passwordHash);
  return valid ? user : null;
}

export function getUserById(id: string): DbUser | undefined {
  return db.select().from(users).where(eq(users.id, id)).get();
}

export function getUserProfileDir(userId: string): string {
  return join(config.dataDir, 'profiles', userId, 'claude');
}

export function getUserApiKey(userId: string): string {
  const user = getUserById(userId);
  if (!user) throw new Error('User not found');
  return user.anthropicApiKey;
}
