import {
  HttpService,
  jsonOk,
  jsonNoContent,
  jsonNotFound,
  jsonUnauthorized,
  securityOk,
  optional,
  run,
} from '@ovotech/laminar';
import axios from 'axios';
import { join } from 'path';
import { openApiTyped, Pet } from './__generated__/integration.api';
import { axiosOapi } from './__generated__/integration.axios';

interface AuthInfo {
  authInfo?: {
    user?: string;
  };
}

describe('Integration', () => {
  it('Should process response', async () => {
    const db: Pet[] = [
      { id: 111, name: 'Catty', tag: 'kitten' },
      { id: 222, name: 'Doggy' },
    ];

    const listener = await openApiTyped<AuthInfo>({
      api: join(__dirname, 'integration.yaml'),
      security: {
        BearerAuth: ({ headers }) =>
          headers.authorization === 'Bearer 123'
            ? securityOk({ user: 'dinkey' })
            : jsonUnauthorized({ message: 'Unathorized user' }),
        BasicAuth: ({ headers }) =>
          headers.authorization === 'Basic 123'
            ? securityOk({ user: 'basickey' })
            : jsonUnauthorized({ message: 'Unathorized user' }),
        ApiKeyAuth: ({ headers }) =>
          headers['x-api-key'] === 'Me'
            ? securityOk({ user: 'apikey' })
            : jsonUnauthorized({ message: 'Unathorized user' }),
      },
      paths: {
        '/pets': {
          get: async ({ query }) =>
            jsonOk(db.filter((pet) => (query.tags ? (pet.tag ? query.tags.includes(pet.tag) : false) : true))),
          post: async ({ body, authInfo }) => {
            const pet = { ...body, id: Math.max(...db.map((item) => item.id)) + 1 };
            db.push(pet);
            return jsonOk({ pet, user: authInfo && authInfo.user });
          },
        },
        '/pets/{id}': {
          get: async ({ path }) => {
            const pet = db.find((item) => item.id === Number(path.id));
            return optional(jsonOk, pet) ?? jsonNotFound({ code: 123, message: 'Not Found' });
          },
          delete: async ({ path }) => {
            const index = db.findIndex((item) => item.id === Number(path.id));
            if (index !== -1) {
              db.splice(index, 1);
              return jsonNoContent();
            } else {
              return jsonNotFound({ code: 12, message: 'Item not found' });
            }
          },
        },
      },
    });

    const http = new HttpService({ listener, port: 4920 });

    await run({ services: [http] }, async () => {
      const api = axiosOapi(axios.create({ baseURL: 'http://localhost:4920' }));

      await expect(api.api.get('/unknown-url').catch((error) => error.response)).resolves.toMatchObject({
        status: 404,
        data: {
          message: 'Request for "GET /unknown-url" did not match any of the paths defined in the OpenApi Schema',
        },
      });

      await expect(api['GET /pets']()).resolves.toMatchObject({
        status: 200,
        data: [
          { id: 111, name: 'Catty', tag: 'kitten' },
          { id: 222, name: 'Doggy' },
        ],
      });

      await expect(
        api['POST /pets'](
          { name: 'New Puppy' },
          { headers: { Authorization: 'Bearer 000', 'x-trace-token': '123' } },
        ).catch((error) => error.response),
      ).resolves.toMatchObject({
        status: 401,
        data: { message: 'Unathorized user' },
      });

      await expect(
        api['POST /pets']({ name: 'New Puppy' }, { headers: { Authorization: 'Bearer 123', 'x-trace-token': '123' } }),
      ).resolves.toMatchObject({
        status: 200,
        data: { pet: { id: 223, name: 'New Puppy' }, user: 'dinkey' },
      });

      await expect(api['GET /pets/{id}']('111', { headers: { Authorization: 'Basic 123' } })).resolves.toMatchObject({
        status: 200,
        data: { id: 111, name: 'Catty', tag: 'kitten' },
      });

      await expect(
        api['GET /pets/{id}']('000', { headers: { Authorization: 'Basic 123' } }).catch((error) => error.response),
      ).resolves.toMatchObject({
        status: 404,
        data: {
          code: 123,
          message: 'Not Found',
        },
      });

      await expect(api['GET /pets/{id}']('223', { headers: { Authorization: 'Basic 123' } })).resolves.toMatchObject({
        status: 200,
        data: { id: 223, name: 'New Puppy' },
      });

      await expect(api['GET /pets']()).resolves.toMatchObject({
        status: 200,
        data: [
          { id: 111, name: 'Catty', tag: 'kitten' },
          { id: 222, name: 'Doggy' },
          { id: 223, name: 'New Puppy' },
        ],
      });

      await expect(api['GET /pets']({ params: { tags: ['kitten'] } })).resolves.toMatchObject({
        status: 200,
        data: [{ id: 111, name: 'Catty', tag: 'kitten' }],
      });

      await expect(
        api['DELETE /pets/{id}']('228', { headers: { 'X-API-KEY': 'Me' } }).catch((error) => error.response),
      ).resolves.toMatchObject({
        status: 404,
        data: {
          code: 12,
          message: 'Item not found',
        },
      });

      await expect(
        api['DELETE /pets/{id}']('222', { headers: { 'X-API-missing': 'Me' } }).catch((error) => error.response),
      ).resolves.toMatchObject({
        status: 401,
        data: { message: 'Unathorized user' },
      });

      await expect(api['DELETE /pets/{id}']('222', { headers: { 'X-API-KEY': 'Me' } })).resolves.toMatchObject({
        status: 204,
        data: {},
      });

      await expect(api['GET /pets']()).resolves.toMatchObject({
        status: 200,
        data: [
          { id: 111, name: 'Catty', tag: 'kitten' },
          { id: 223, name: 'New Puppy' },
        ],
      });
    });
  });
});
