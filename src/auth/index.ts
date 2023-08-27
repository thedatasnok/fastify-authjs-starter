import { Auth } from '@auth/core';
import type { AuthAction, AuthConfig } from '@auth/core/types';
import fp from 'fastify-plugin';

export interface FastifyAuthConfig extends AuthConfig {
  prefix?: string;
}

const ACTIONS: AuthAction[] = [
  'callback',
  'csrf',
  'error',
  'providers',
  'session',
  'signin',
  'signout',
  'verify-request',
];

export const AuthPlugin = fp<FastifyAuthConfig>((server, options, done) => {
  const { prefix = '/auth' } = options;

  options.secret ??= process.env.AUTH_SECRET;
  options.trustHost ??= !!(
    process.env.AUTH_TRUST_HOST ??
    process.env.VERCEL ??
    process.env.NODE_ENV !== 'production'
  );

  server.route({
    url: prefix + '/*',
    method: ['GET', 'POST'],
    handler: async (request, reply) => {
      const url = new URL(
        `${request.protocol}://${request.hostname}${request.url}`
      );

      const action = url.pathname
        .slice(prefix.length + 1)
        .split('/')[0] as AuthAction;

      if (!ACTIONS.includes(action) || !url.pathname.startsWith(prefix + '/')) {
        return reply.callNotFound();
      }

      const convertedRequest = new Request(url, {
        body: request.body as any,
        headers: request.headers as any,
        method: request.method,
      });

      const response = await Auth(convertedRequest, options);

      reply.status(response.status);
      reply.headers(Object.fromEntries(response.headers.entries()));

      reply.send(await response.text());
    },
  });

  done();
});
