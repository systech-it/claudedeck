import type { FastifyPluginAsync } from 'fastify';
import { execSync } from 'child_process';
import { config } from '../config.js';
import { checkForUpdates, getCachedVersionInfo } from '../services/updater.service.js';
import { db } from '../db/index.js';
import { users, sessions } from '../db/schema.js';
import { sql } from 'drizzle-orm';

const systemRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/api/system/version', async (_request, reply) => {
    return reply.send({ version: config.version });
  });

  fastify.get('/api/system/update-check', async (_request, reply) => {
    const info = getCachedVersionInfo();
    return reply.send(info);
  });

  fastify.post(
    '/api/system/update-check',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      if (!request.user.isAdmin) {
        return reply.status(403).send({ error: 'Admin only' });
      }
      const info = await checkForUpdates();
      return reply.send(info);
    }
  );

  fastify.get(
    '/api/system/info',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      if (!request.user.isAdmin) {
        return reply.status(403).send({ error: 'Admin only' });
      }

      let claudeVersion: string | undefined;
      try {
        claudeVersion = execSync(`${config.claudeBin} --version`, { timeout: 5000 })
          .toString()
          .trim();
      } catch {
        claudeVersion = 'unknown';
      }

      const userCount = db.select({ count: sql<number>`count(*)` }).from(users).get()?.count ?? 0;
      const sessionCount =
        db.select({ count: sql<number>`count(*)` }).from(sessions).get()?.count ?? 0;

      return reply.send({
        version: config.version,
        nodeVersion: process.version,
        platform: process.platform,
        claudeBinPath: config.claudeBin,
        claudeVersion,
        dataDir: config.dataDir,
        userCount,
        sessionCount,
      });
    }
  );
};

export default systemRoutes;
