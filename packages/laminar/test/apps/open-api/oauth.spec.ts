import axios from 'axios';
import { sign, verify } from 'jsonwebtoken';
import { join } from 'path';
import { URL, URLSearchParams } from 'url';
import { OapiConfig, openApi, securityOk, HttpServer, jsonOk, redirect, jsonForbidden, setCookie } from '../../../src';
import axiosCookieJarSupport from 'axios-cookiejar-support';

const globalSecret = 'oauth2-global';
const tokenSecret = 'oauth2-token';

describe('Oauth', () => {
  it('Should implement oauth2 security', async () => {
    const authorizationServer = new HttpServer({
      app: ({ query: { redirectUrl, original, scopes } }) => {
        const code = sign({ email: 'me@example.com', scopes }, globalSecret);
        const url = new URL(redirectUrl);
        url.search = new URLSearchParams({ code, original }).toString();
        return redirect(url.toString());
      },
      port: 8068,
    });

    const config: OapiConfig = {
      api: join(__dirname, 'oauth.yaml'),
      security: {
        SlackSecurity: ({ cookies, scopes, url }) => {
          if (cookies?.auth) {
            try {
              const user = verify(cookies.auth, tokenSecret);
              return securityOk(user);
            } catch (error) {
              return jsonForbidden({ message: 'Access code invalid' });
            }
          }

          const authUrl = new URL('http://localhost:8068/oauth/authorize');
          const redirectUrl = 'http://localhost:8067/oauth.access';
          const original = url.toString();
          authUrl.search = new URLSearchParams({ redirectUrl, scopes, original }).toString();
          return redirect(authUrl.toString());
        },
      },
      paths: {
        '/oauth.access': {
          get: ({ query: { code, original } }) => {
            try {
              const user = verify(code, globalSecret);
              return setCookie({ auth: sign(user, tokenSecret) }, redirect(original));
            } catch (error) {
              return jsonForbidden({ message: 'Code invalid' });
            }
          },
        },
        '/user': {
          post: ({ body }) => jsonOk({ result: 'ok', user: body }),
          get: ({ authInfo }) => jsonOk({ email: 'me@example.com', authInfo }),
        },
      },
    };

    const app = await openApi(config);
    const server = new HttpServer({ app, port: 8067 });

    try {
      await server.start();
      await authorizationServer.start();

      const api = axiosCookieJarSupport(axios.create({ baseURL: 'http://localhost:8067' }));
      const { data } = await api.get('/user', { withCredentials: true, jar: true });

      expect(data).toEqual({
        email: 'me@example.com',
        authInfo: expect.objectContaining({ email: 'me@example.com', scopes: 'users:read' }),
      });
    } finally {
      await server.stop();
      await authorizationServer.stop();
    }
  });
});
