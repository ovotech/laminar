import axios from 'axios';
import { run } from '@ovotech/laminar';
import { createSession } from '@ovotech/laminar-jwt';
import { createApplication } from '../src/application';
import { EnvVars } from '../src/env';

const env: EnvVars = {
  HOST: 'localhost',
  SECRET: 'TEST_SECRET',
  PG: 'postgres://example-admin:example-pass@localhost:5432/example',
  PORT: '4400',
};
const logger = { info: jest.fn(), error: jest.fn(), warn: jest.fn(), log: jest.fn(), debug: jest.fn() };

describe('Petstore Integration Tests', () => {
  it('Should work as a petstore', async () => {
    const app = await createApplication(env, logger);

    const { jwt } = createSession({ secret: app.secret }, { email: 'me@example.com', scopes: [] });
    const client = axios.create({ baseURL: app.http.url(), headers: { Authorization: `Bearer ${jwt}` } });

    await run(app, async () => {
      await app.pg.pool.query('DELETE FROM pets');

      const petsList = await client.get('/pets');

      expect(petsList).toMatchObject({
        status: 200,
        data: [],
      });

      const charlie = await client.post(
        '/pets',
        { name: 'Charlie', tag: 'dog' },
        { headers: { 'x-trace-token': 'me' } },
      );

      expect(charlie).toMatchObject({
        status: 200,
        data: { id: expect.any(Number), name: 'Charlie', tag: 'dog' },
      });

      const leya = await client.post('/pets', { name: 'Leya', tag: 'cat' }, { headers: { 'x-trace-token': 'me' } });

      expect(leya).toMatchObject({
        status: 200,
        data: { id: expect.any(Number), name: 'Leya', tag: 'cat' },
      });

      const petsListWithLimit = await client.get('/pets?limit=2');

      expect(petsListWithLimit).toMatchObject({
        status: 200,
        data: [
          { id: expect.any(Number), name: 'Charlie', tag: 'dog' },
          { id: expect.any(Number), name: 'Leya', tag: 'cat' },
        ],
      });

      const petsListOnlyDogs = await client.get('/pets?tags[]=dog');

      expect(petsListOnlyDogs).toMatchObject({
        status: 200,
        data: [{ id: expect.any(Number), name: 'Charlie', tag: 'dog' }],
      });

      const getCharlie = await client.get(`/pets/${charlie.data.id}`);

      expect(getCharlie).toMatchObject({
        status: 200,
        data: { id: expect.any(Number), name: 'Charlie', tag: 'dog' },
      });

      const getLeya = await client.get(`/pets/${leya.data.id}`);

      expect(getLeya).toMatchObject({
        status: 200,
        data: { id: expect.any(Number), name: 'Leya', tag: 'cat' },
      });

      const deleteLeya = await client.delete(`/pets/${leya.data.id}`);

      expect(deleteLeya).toMatchObject({
        status: 204,
      });

      const deleteCharlie = await client.delete(`/pets/${charlie.data.id}`);

      expect(deleteCharlie).toMatchObject({
        status: 204,
      });

      const petsListEmpty = await client.get('/pets');

      expect(petsListEmpty).toMatchObject({
        status: 200,
        data: [],
      });
    });
  });
});
