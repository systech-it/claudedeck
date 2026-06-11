import type { FastifyPluginAsync } from 'fastify';
import { fetchUsage } from '../services/usage.service.js';

const usageRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    '/api/usage',
    { onRequest: [fastify.authenticate] },
    async (_request, reply) => {
      const data = await fetchUsage();
      return reply.send(data);
    }
  );
};

export default usageRoutes;
