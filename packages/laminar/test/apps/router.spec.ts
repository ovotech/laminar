import axios from 'axios';
import { HttpService, textOk, router, get, post, route, run } from '../../src';

const api = axios.create({ baseURL: 'http://localhost:8096' });

describe('router middleware', () => {
  it('Should route resolvers correctly', async () => {
    const http = new HttpService({
      port: 8096,
      listener: router(
        route({
          path: /^\/one/,
          listener: router(
            get('/one/foo/{id}', async ({ path: { id } }) => textOk(`One foo ${id}`)),
            post('/one/bar/{id}', async ({ path: { id } }) => textOk(`One bar ${id}`)),
            async () => textOk('one not found'),
          ),
        }),
        route({
          path: /^\/two/,
          listener: router(
            get(/^\/two\/foo\/(\d+)/, async ({ path: [id] }) => textOk(`two foo ${id}`)),
            get(/^\/two\/bar\/(\d+)$/, async ({ path: [id] }) => textOk(`two bar ${id}`)),
            get(/^\/two\/bar\/(\d+)\/(\d+)/, async ({ path: [id, serial] }) => textOk(`two bar ${id}:${serial}`)),
            async () => textOk('two not found'),
          ),
        }),

        async () => textOk('nothing'),
      ),
    });
    await run({ services: [http] }, async () => {
      await expect(api.get('/one/foo/10')).resolves.toMatchObject({
        status: 200,
        data: 'One foo 10',
      });
      await expect(api.get('/one/foo/20')).resolves.toMatchObject({
        status: 200,
        data: 'One foo 20',
      });
      await expect(api.get('/one/foo/test-id')).resolves.toMatchObject({
        status: 200,
        data: 'One foo test-id',
      });
      await expect(api.post('/one/bar/20')).resolves.toMatchObject({
        status: 200,
        data: 'One bar 20',
      });
      await expect(api.get('/one')).resolves.toMatchObject({ status: 200, data: 'one not found' });

      await expect(api.get('/two/foo/10')).resolves.toMatchObject({
        status: 200,
        data: 'two foo 10',
      });
      await expect(api.get('/two/bar/10')).resolves.toMatchObject({
        status: 200,
        data: 'two bar 10',
      });
      await expect(api.get('/two/bar/10/123')).resolves.toMatchObject({
        status: 200,
        data: 'two bar 10:123',
      });
      await expect(api.get('/two/bar/test-id')).resolves.toMatchObject({
        status: 200,
        data: 'two not found',
      });
      await expect(api.get('/two')).resolves.toMatchObject({ status: 200, data: 'two not found' });

      await expect(api.get('/ttas')).resolves.toMatchObject({ status: 200, data: 'nothing' });
    });
  });
});
