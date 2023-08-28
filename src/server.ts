import DiscordProvider from '@auth/core/providers/discord';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import fastify from 'fastify';
import { AuthPlugin } from './auth';
import { db } from './db';
import { UserModule } from './users';

const server = fastify({
  logger:
    process.env.NODE_ENV !== 'production'
      ? {
          transport: {
            target: 'pino-pretty',
          },
        }
      : true,
});

server.register(UserModule);

server.register(AuthPlugin, {
  prefix: '/api/v1/auth',
  adapter: DrizzleAdapter(db),
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET,
    }),
  ],
});

export const startServer = async () => {
  try {
    await server.listen({
      port: 3000,
    });
  } catch (error) {
    server.log.error(error);
    process.exit(1);
  }
};
