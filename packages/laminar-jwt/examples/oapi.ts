import { HttpService, init, jsonOk, openApi } from '@ovotech/laminar';
import { createSession, jwtSecurityResolver } from '@ovotech/laminar-jwt';
import { join } from 'path';

const main = async () => {
  const secret = '123';
  const listener = await openApi({
    api: join(__dirname, 'oapi.yaml'),
    security: { JWTSecurity: jwtSecurityResolver({ secret }) },
    paths: {
      '/session': {
        post: async ({ body }) => jsonOk(createSession({ secret }, body)),
      },
      '/test': {
        get: async ({ authInfo }) => jsonOk({ text: 'ok', user: authInfo }),
        post: async ({ authInfo }) => jsonOk({ text: 'ok', user: authInfo }),
      },
    },
  });
  const http = new HttpService({ listener });
  await init({ services: [http], logger: console });
};

main();
