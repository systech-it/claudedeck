import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import {
  listUserSessions,
  getSession,
  createSession,
  renameSession,
  deleteSession,
  syncServerSessions,
  getSessionHistory,
} from '../services/session.service.js';

const sessionsRoutes: FastifyPluginAsync = async (fastify) => {
  const auth = { onRequest: [fastify.authenticate] };

  fastify.get('/api/sessions', auth, async (request, reply) => {
    const { userId } = request.user;
    // Sync local Claude Code sessions in the background (non-blocking)
    setImmediate(() => { try { syncServerSessions(userId); } catch { /* ignore */ } });
    return reply.send(listUserSessions(userId));
  });

  fastify.post('/api/sessions', auth, async (request, reply) => {
    const body = z
      .object({ projectPath: z.string().min(1).default('/tmp') })
      .safeParse(request.body);

    if (!body.success) {
      return reply.status(400).send({ error: 'Invalid request' });
    }

    const { userId } = request.user;
    const session = createSession(userId, body.data.projectPath);
    return reply.status(201).send(session);
  });

  fastify.get('/api/sessions/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { userId } = request.user;

    const session = getSession(id, userId);
    if (!session) return reply.status(404).send({ error: 'Session not found' });

    return reply.send(session);
  });

  fastify.patch('/api/sessions/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { userId } = request.user;

    const body = z.object({ title: z.string().min(1).max(80) }).safeParse(request.body);
    if (!body.success) return reply.status(400).send({ error: 'Invalid title' });

    const session = getSession(id, userId);
    if (!session) return reply.status(404).send({ error: 'Session not found' });

    renameSession(id, userId, body.data.title);
    return reply.status(204).send();
  });

  fastify.get('/api/sessions/:id/history', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { userId } = request.user;
    const messages = getSessionHistory(id, userId);
    return reply.send(messages);
  });

  fastify.delete('/api/sessions/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { userId } = request.user;

    try {
      deleteSession(id, userId);
      return reply.status(204).send();
    } catch {
      return reply.status(404).send({ error: 'Session not found' });
    }
  });
};

export default sessionsRoutes;
