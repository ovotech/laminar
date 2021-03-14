import { get, post, init, HttpServer, jsonOk, router, HttpApp } from '@ovotech/laminar';
import { authMiddleware, createSession } from '@ovotech/laminar-jwt';

const secret = '123';
const auth = authMiddleware({ secret });

// A middleware that would actually restrict access
const loggedIn = auth();
const admin = auth(['admin']);

const app: HttpApp = router(
  get('/.well-known/health-check', async () => jsonOk({ health: 'ok' })),
  post('/session', async ({ body }) => jsonOk(createSession({ secret }, body))),
  post(
    '/test',
    admin(async ({ authInfo }) => jsonOk({ result: 'ok', user: authInfo })),
  ),
  get(
    '/test',
    loggedIn(async () => jsonOk('index')),
  ),
);

const http = new HttpServer({ app });

init({ services: [http], logger: console });
