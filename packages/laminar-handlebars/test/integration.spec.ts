import { get, post, router, HttpService, run } from '@ovotech/laminar';
import axios, { AxiosResponse } from 'axios';
import { writeFileSync, mkdirSync } from 'fs';
import { retry } from 'ts-retry-promise';
import { join } from 'path';
import { handlebarsMiddleware } from '../src';

const axiosSnapshot = {
  config: expect.anything(),
  request: expect.anything(),
  headers: { date: expect.anything() },
};

const capitalizeName = (name: string): string => name.toUpperCase();

describe('Integration', () => {
  it('Should process response', async () => {
    const handlebars = handlebarsMiddleware({
      dir: join(__dirname, 'root'),
      helpers: { capitalizeName },
    });

    const http = new HttpService({
      port: 8062,
      listener: handlebars(
        router(
          get('/', async ({ hbs }) => hbs('index')),
          post('/result', async ({ hbs, body: { name } }) => hbs('result', { name }, { status: 201 })),
        ),
      ),
    });

    const api = axios.create({ baseURL: 'http://localhost:8062' });

    await run({ services: [http] }, async () => {
      expect(await api.get('/')).toMatchSnapshot<AxiosResponse>(axiosSnapshot);
      expect(await api.post('/result', { name: 'John Smith' })).toMatchSnapshot<AxiosResponse>(axiosSnapshot);
    });
  });

  it.each`
    cacheType    | expectedData
    ${'expiry'}  | ${'<html><body>Layout 2 <span>Generated 2</span></body></html>'}
    ${'none'}    | ${'<html><body>Layout 2 <span>Generated 2</span></body></html>'}
    ${'preload'} | ${'<html><body>Layout <span>Generated</span></body></html>'}
  `('Should process changing handlebars tempaltes with $cacheType', async ({ cacheType, expectedData }) => {
    jest.setTimeout(10000);

    const dir = join(__dirname, '__generated__/root');
    mkdirSync(join(dir, 'views'), { recursive: true });
    mkdirSync(join(dir, 'partials'), { recursive: true });
    writeFileSync(join(dir, 'views/index.hbs'), '{{#> layout }}<span>Generated</span>{{/layout}}');
    writeFileSync(join(dir, 'partials/layout.hbs'), '<html><body>Layout {{> @partial-block }}</body></html>');

    await new Promise((resolve) => setTimeout(resolve, 500));

    const handlebars = handlebarsMiddleware({ dir, extension: 'hbs', cacheType });

    const http = new HttpService({
      port: 8062,
      listener: handlebars(router(get('/', async ({ hbs }) => hbs('index')))),
    });

    const api = axios.create({ baseURL: 'http://localhost:8062' });

    await run({ services: [http] }, async () => {
      expect((await api.get('/')).data).toEqual('<html><body>Layout <span>Generated</span></body></html>');

      writeFileSync(join(dir, 'partials/layout.hbs'), '<html><body>Layout 2 {{> @partial-block }}</body></html>');
      writeFileSync(join(dir, 'views/index.hbs'), '{{#> layout }}<span>Generated 2</span>{{/layout}}');

      await retry(async () => expect((await api.get('/')).data).toEqual(expectedData), { delay: 500, retries: 10 });
    });
  });
});
