import { HttpApp, jsonOk, ok, yaml, RequestLogging, RequestPg } from '@ovotech/laminar';
import { jwtSecurityResolver } from '@ovotech/laminar-jwt';
import { createReadStream } from 'fs';
import { join } from 'path';
import { openApiTyped } from '../../__generated__/schema';
import { EnvVars } from '../../env';

export const httpApp = async (env: EnvVars): Promise<HttpApp<RequestPg & RequestLogging>> => {
  const schemaFilename = join(__dirname, '../../../schema.yaml');
  const app = await openApiTyped<RequestPg & RequestLogging>({
    api: schemaFilename,
    security: {
      BearerAuth: jwtSecurityResolver({ secret: env.SECRET }),
    },
    paths: {
      '/.well-known/health-check': {
        get: async () => jsonOk({ healthy: true }),
      },
      '/.well-known/openapi.yaml': {
        get: async () => yaml(ok({ body: createReadStream(schemaFilename) })),
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
