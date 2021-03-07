import {
  get,
  HttpServer,
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
} from '@ovotech/laminar';
import { createReadStream } from 'fs';
import { join } from 'path';

const server = new HttpServer({
  app: router(
    // Redirects
    get('/redirect', () => redirect('http://my-new-location.example.com', { headers: { 'X-Other': 'Other' } })),

    // Static files
    get('/static-file', () => file(join(__dirname, 'assets/start.svg'))),

    // Different stream types
    get('/text-stream', () => textOk(createReadStream(join(__dirname, 'assets/texts/one.txt')))),
    get('/html-stream', () => htmlOk(createReadStream(join(__dirname, 'assets/texts/other.html')))),

    // JSON Responses
    get('/json/forbidden', () => jsonForbidden({ message: 'Not Authorized' })),
    get('/json/object', () => jsonOk({ health: 'ok' })),
    get('/json/not-found-response', () => jsonNotFound({ message: 'not found' })),
    get('/json/bad-request', () => jsonBadRequest({ message: 'not found' })),

    // Custom status code
    get('/json/208', () => json({ body: { message: 'custom response' }, status: 208 })),

    // HTML Responses
    get('/json/forbidden', () => htmlForbidden('<html>Forbidden</html>')),
    get('/html/object', () => htmlOk('<html>OK</html>')),
    get('/html/not-found-response', () => htmlNotFound('<html>Not Found</html>')),
    get('/html/bad-request', () => htmlBadRequest('<html>Bad Request</html>')),

    // Additional Types
    get('/csv/ok', () => csv(ok({ body: 'one,two,three' }))),
    get('/csv/error', () => csv(badRequest({ body: 'error,error2,error3' }))),
  ),
});

server.start().then((server) => console.log(server.describe()));
