import { HttpService, init, openApi, textOk, setCookie } from '@ovotech/laminar';
import { createSession, verifyToken } from '@ovotech/laminar-jwt';
import { join } from 'path';

const main = async () => {
  const secret = '123';
  const listener = await openApi({
    api: join(__dirname, 'oapi-api-key.yaml'),
    security: {
      /**
       * Implement cookie security.
       */
      CookieSecurity: ({ cookies, scopes }) => verifyToken({ secret }, cookies?.auth, scopes),
    },
    paths: {
      '/session': {
        post: async ({ body }) => setCookie({ auth: createSession({ secret }, body).jwt }, textOk('Cookie Set')),
      },
      '/test': {
        get: async () => textOk('OK'),
        post: async ({ authInfo }) => textOk(`OK ${authInfo.email}`),
      },
    },
  });
  const http = new HttpService({ listener });
  await init({ services: [http], logger: console });
};

main();
