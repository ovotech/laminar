import { HttpApp, jsonOk, ok, yaml, RequestLogging } from '@ovotech/laminar';
import { RequestPgPool } from '@ovotech/laminar-pg';
import { jwtSecurityResolver } from '@ovotech/laminar-jwt';
import { readFileSync } from 'fs';
import { join } from 'path';
import { openApiTyped } from '../../__generated__/schema';
import { EnvVars } from '../../env';

export const httpApp = async (env: EnvVars): Promise<HttpApp<RequestPgPool & RequestLogging>> => {
  const api = readFileSync(join(__dirname, '../../schema.yaml'), 'utf-8');
  const app = await openApiTyped<RequestPgPool & RequestLogging>({
    api,
    security: {
      BearerAuth: jwtSecurityResolver({ secret: env.SECRET }),
    },
    paths: {
      '/.well-known/health-check': {
        get: async () => jsonOk({ healthy: true }),
      },
      '/.well-known/openapi.yaml': {
        get: async () => yaml(ok({ body: api })),
      },
      '/v1/hydration/meter-reads': {
        post: async ({ body, logger }) => {
          logger.info(body);
          return jsonOk({ success: true });
        },
      },
      '/v1/status': {
        get: async () => jsonOk({ data: [], consumptions: [], hydrations: [], isOutOfDate: false }),
      },
    },
  });

  return app;
};
