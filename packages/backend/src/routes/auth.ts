import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { createUser, verifyUser } from '../services/auth.service.js';
import type { AuthResponse } from '@claudedeck/shared';

const registerSchema = z.object({
  username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_-]+$/),
  password: z.string().min(8).max(128),
  anthropicApiKey: z.string().min(10),
});

const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

const authRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/api/auth/register', async (request, reply) => {
    const body = registerSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: body.error.flatten() });
    }

    try {
      const user = await createUser(body.data);
      const token = fastify.jwt.sign({
        userId: user.id,
        username: user.username,
        isAdmin: user.isAdmin,
      });

      const response: AuthResponse = {
        token,
        user: {
          id: user.id,
          username: user.username,
          isAdmin: user.isAdmin,
          createdAt: user.createdAt,
        },
      };

      return reply.status(201).send(response);
    } catch (err) {
      return reply.status(409).send({ error: (err as Error).message });
    }
  });

  fastify.post('/api/auth/login', async (request, reply) => {
    const body = loginSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Invalid request' });
    }

    const user = await verifyUser(body.data.username, body.data.password);
    if (!user) {
      return reply.status(401).send({ error: 'Invalid username or password' });
    }

    const token = fastify.jwt.sign({
      userId: user.id,
      username: user.username,
      isAdmin: user.isAdmin,
    });

    const response: AuthResponse = {
      token,
      user: {
        id: user.id,
        username: user.username,
        isAdmin: user.isAdmin,
        createdAt: user.createdAt,
      },
    };

    return reply.send(response);
  });

  fastify.get(
    '/api/auth/me',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const { userId, username, isAdmin } = request.user;
      return reply.send({ id: userId, username, isAdmin });
    }
  );
};

export default authRoutes;
