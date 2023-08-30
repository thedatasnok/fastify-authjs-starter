import { Auth } from '@auth/core';
import type { AuthAction, AuthConfig, Session } from '@auth/core/types';
import { FastifyBodyParser, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';

declare module 'fastify' {
  interface FastifyInstance {
    auth: {
      getSession(request: FastifyRequest): GetSessionResult;
    };
  }
}

export interface FastifyAuthConfig extends AuthConfig {
  prefix?: string;
}

export type GetSessionResult = Promise<Session | null>;

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
  const webRequest = new Request(url, {
    method: request.method,
    headers: request.headers as any,
    body: request.body as any,
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

  const parserOptions = { parseAs: 'buffer' } as const;
  const stringParser: FastifyBodyParser<Buffer> = (_request, body, done) => {
    done(null, body.toString());
  };

  server.addContentTypeParser(
    'application/x-www-form-urlencoded',
    parserOptions,
    stringParser
  );

  server.addContentTypeParser('application/json', parserOptions, stringParser);

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

      webResponse.headers.forEach((value, key) => {
        reply.header(key, value);
      });

      reply.status(webResponse.status);
      reply.send(await webResponse.text());
    },
  });

  server.decorate('auth', {
    async getSession(request: FastifyRequest): GetSessionResult {
      const url = new URL(
        `${request.protocol}://${request.hostname}/${options.prefix}/session`
      );

      const webRequest = toWebRequest(url, request);
      const webResponse = await Auth(webRequest, options);

      const { status = 200 } = webResponse;

      const data = await webResponse.json();

      if (!data || !Object.keys(data).length) return null;
      if (status === 200) return data;
      throw new Error(data.message);
    },
  });

  done();
});
