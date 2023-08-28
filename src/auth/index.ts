import { Auth } from '@auth/core';
import type { AuthAction, AuthConfig } from '@auth/core/types';
import { FastifyRequest } from 'fastify';
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

const toWebRequest = (url: URL, request: FastifyRequest): Request => {
  let body: string | null = null;

  if (request.headers['content-type'] === 'application/x-www-form-urlencoded') {
    const params = new URLSearchParams();
    const entries = Object.entries(request.body as Record<string, any>);

    for (let [key, value] of entries) {
      if (Array.isArray(value)) {
        value.forEach((nestedValue) => params.append(key, nestedValue));
      } else {
        params.append(key, value);
      }
    }

    body = params.toString();
  } else if (request.headers['content-type'] === 'application/json') {
    body = JSON.stringify(request.body);
  }

  const webRequest = new Request(url, {
    method: request.method,
    headers: request.headers as any,
    body: body ?? (request.body as any),
  });

  return webRequest;
};

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

      const webRequest = toWebRequest(url, request);
      const webResponse = await Auth(webRequest, options);

      reply.headers(Object.fromEntries(webResponse.headers.entries()));
      reply.status(webResponse.status);
      reply.send(await webResponse.text());
    },
  });

  done();
});
