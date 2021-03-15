import { get, post, HttpService, router, init, jsonOk, HttpListener } from '@ovotech/laminar';
import { authMiddleware, createSession } from '@ovotech/laminar-jwt';
import { readFileSync } from 'fs';
import { join } from 'path';

const publicKey = readFileSync(join(__dirname, './public-key.pem'), 'utf8');
const privateKey = readFileSync(join(__dirname, './private-key.pem'), 'utf8');

// This middleware would only add security related functions to the context, without restricting any access
// You can specify public and private keys, as well as verify options
// to be passed down to the underlying jsonwebtoken package
const auth = authMiddleware({ secret: publicKey, options: { clockTolerance: 2 } });

// A middleware that would actually restrict access
const onlyLoggedIn = auth();
const onlyAdmin = auth(['admin']);

const listener: HttpListener = router(
  get('/.well-known/health-check', async () => jsonOk({ health: 'ok' })),
  post('/session', async ({ body }) =>
    jsonOk(createSession({ secret: privateKey, options: { algorithm: 'RS256' } }, body)),
  ),
  post(
    '/test',
    onlyAdmin(async ({ authInfo }) => jsonOk({ result: 'ok', user: authInfo })),
  ),
  get(
    '/test',
    onlyLoggedIn(async () => jsonOk('index')),
  ),
);

const http = new HttpService({ listener });
init({ services: [http], logger: console });
