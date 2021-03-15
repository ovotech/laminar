import {
  get,
  HttpService,
  router,
  jsonOk,
  jsonNotFound,
  redirect,
  jsonForbidden,
  file,
  jsonBadRequest,
  htmlBadRequest,
  htmlForbidden,
  htmlNotFound,
  htmlOk,
  json,
  csv,
  ok,
  badRequest,
  textOk,
  init,
} from '@ovotech/laminar';
import { createReadStream } from 'fs';
import { join } from 'path';

const http = new HttpService({
  listener: router(
    // Redirects
    get('/redirect', async () => redirect('http://my-new-location.example.com', { headers: { 'X-Other': 'Other' } })),

    // Static files
    get('/static-file', async () => file(join(__dirname, 'assets/start.svg'))),

    // Different stream types
    get('/text-stream', async () => textOk(createReadStream(join(__dirname, 'assets/texts/one.txt')))),
    get('/html-stream', async () => htmlOk(createReadStream(join(__dirname, 'assets/texts/other.html')))),

    // JSON Responses
    get('/json/forbidden', async () => jsonForbidden({ message: 'Not Authorized' })),
    get('/json/object', async () => jsonOk({ health: 'ok' })),
    get('/json/not-found-response', async () => jsonNotFound({ message: 'not found' })),
    get('/json/bad-request', async () => jsonBadRequest({ message: 'not found' })),

    // Custom status code
    get('/json/208', async () => json({ body: { message: 'custom response' }, status: 208 })),

    // HTML Responses
    get('/json/forbidden', async () => htmlForbidden('<html>Forbidden</html>')),
    get('/html/object', async () => htmlOk('<html>OK</html>')),
    get('/html/not-found-response', async () => htmlNotFound('<html>Not Found</html>')),
    get('/html/bad-request', async () => htmlBadRequest('<html>Bad Request</html>')),

    // Additional Types
    get('/csv/ok', async () => csv(ok({ body: 'one,two,three' }))),
    get('/csv/error', async () => csv(badRequest({ body: 'error,error2,error3' }))),
  ),
});

init({ services: [http], logger: console });
