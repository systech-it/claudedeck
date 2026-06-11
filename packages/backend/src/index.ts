import 'dotenv/config';
import Fastify from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import fastifyCors from '@fastify/cors';
import fastifyJwt from '@fastify/jwt';
import fastifyStatic from '@fastify/static';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

import { config } from './config.js';
import { initDb } from './db/index.js';
import { startUpdateChecker } from './services/updater.service.js';
import { handleWsConnection } from './ws/handler.js';
import authRoutes from './routes/auth.js';
import sessionRoutes from './routes/sessions.js';
import systemRoutes from './routes/system.js';
import usageRoutes from './routes/usage.js';
import type { AuthTokenPayload } from '@claudedeck/shared';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: AuthTokenPayload;
    user: AuthTokenPayload;
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

const __dirname = dirname(fileURLToPath(import.meta.url));

const fastify = Fastify({
  logger: {
    level: config.isDev ? 'debug' : 'info',
    transport: config.isDev ? { target: 'pino-pretty' } : undefined,
  },
});

async function buildApp() {
  await fastify.register(fastifyCors, {
    origin: config.corsOrigins.length > 0 ? config.corsOrigins : false,
    credentials: true,
  });

  await fastify.register(fastifyJwt, {
    secret: config.jwtSecret,
    sign: { expiresIn: config.jwtExpiresIn },
  });

  fastify.decorate('authenticate', async function (request: any, reply: any) {
    try {
      await request.jwtVerify();
    } catch {
      reply.status(401).send({ error: 'Unauthorized' });
    }
  });

  await fastify.register(fastifyWebsocket);

  fastify.get(
    '/ws',
    { websocket: true },
    async (connection, request) => {
      // @fastify/websocket passes a Duplex stream as first arg; raw WebSocket is at .socket
      const ws = (connection as any).socket as import('ws').WebSocket;
      try {
        await (request as any).jwtVerify();
      } catch {
        const token = ((request.query as Record<string, string>) ?? {}).token;
        if (token) {
          try {
            (request as any).user = fastify.jwt.verify(token);
          } catch {
            ws.close(4001, 'Unauthorized');
            return;
          }
        } else {
          ws.close(4001, 'Unauthorized');
          return;
        }
      }
      handleWsConnection(ws, request as any);
    }
  );

  await fastify.register(authRoutes);
  await fastify.register(sessionRoutes);
  await fastify.register(systemRoutes);
  await fastify.register(usageRoutes);

  const frontendDist = join(__dirname, '../../frontend/dist');
  if (existsSync(frontendDist)) {
    await fastify.register(fastifyStatic, {
      root: frontendDist,
      prefix: '/',
    });

    fastify.setNotFoundHandler((_request, reply) => {
      reply.sendFile('index.html');
    });
  }

  fastify.get('/health', async () => ({ status: 'ok', version: config.version }));

  return fastify;
}

async function start() {
  initDb();
  startUpdateChecker();

  const app = await buildApp();

  try {
    await app.listen({ port: config.port, host: config.host });
    console.info(`ClaudeDeck running at http://${config.host}:${config.port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
