import fp from 'fastify-plugin';
import { db } from '../db';
import { users } from '../db/schema';

export const UserModule = fp((server, _options, done) => {
  server.get('/api/v1/users', async (_request, reply) => {
    const foundUsers = await db
      .select({
        id: users.id,
        username: users.email,
        verified: users.emailVerified,
      })
      .from(users);

    reply.send({ users: foundUsers });
  });

  done();
});
