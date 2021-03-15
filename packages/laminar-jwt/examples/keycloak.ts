import { get, post, HttpService, router, init, jsonOk } from '@ovotech/laminar';
import { jwkPublicKey, createSession, keycloakAuthMiddleware } from '@ovotech/laminar-jwt';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as nock from 'nock';

/**
 * Make sure we have some response from a url
 */
const jwkFile = readFileSync(join(__dirname, './jwk.json'), 'utf8');
nock('http://example.com/').get('/jwk.json').reply(200, JSON.parse(jwkFile));

/**
 * The public key is now a function that would attempt to retrieve the jwk from a url
 * You can also cache it or specify the max age, which by default is 0 and would never expire.
 */
const publicKey = jwkPublicKey({ uri: 'http://example.com/jwk.json', cache: true });
const privateKey = readFileSync(join(__dirname, './private-key.pem'), 'utf8');

const keyid = JSON.parse(jwkFile).keys[0].kid;
const sessionOptions = { secret: privateKey, options: { algorithm: 'RS256' as const, keyid } };

const auth = keycloakAuthMiddleware({ secret: publicKey, service: 'my-service-name' });

// A middleware that would actually restrict access
const loggedIn = auth();
const admin = auth(['admin']);

const http = new HttpService({
  listener: router(
    get('/.well-known/health-check', async () => jsonOk({ health: 'ok' })),
    post('/session', async ({ body }) => jsonOk(createSession(sessionOptions, body))),
    post(
      '/test',
      admin(async ({ authInfo }) => jsonOk({ result: 'ok', user: authInfo })),
    ),
    get(
      '/test',
      loggedIn(async () => jsonOk('index')),
    ),
  ),
});
init({ services: [http], logger: console });
