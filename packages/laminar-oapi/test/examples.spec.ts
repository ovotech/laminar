import axios, { AxiosRequestConfig } from 'axios';
import { spawn } from 'child_process';
import { join } from 'path';
import * as nock from 'nock';

nock('http://example.com').get('/new/22').reply(200, { isNew: true });

describe('Example files', () => {
  it.each<[string, AxiosRequestConfig, unknown]>([
    [
      'examples/security.ts',
      {
        method: 'GET',
        url: 'http://localhost:3333/user',
        headers: { Authorization: 'Bearer my-secret-token' },
      },
      { email: 'me@example.com' },
    ],
    [
      'examples/simple.ts',
      {
        method: 'GET',
        url: 'http://localhost:3333/user',
      },
      { email: 'me@example.com' },
    ],
    [
      'examples/undocumented-routes.ts',
      {
        method: 'GET',
        url: 'http://localhost:3333/old/22',
      },
      { isNew: true },
    ],
  ])('Should process %s', async (file, config, expected) => {
    const service = spawn('yarn', ['ts-node', file], {
      cwd: join(__dirname, '..'),
      detached: true,
    });
    const errorLogger = (data: Buffer): void => console.error(data.toString());

    try {
      service.stderr.on('data', errorLogger);
      await new Promise((resolve) => {
        service.stdout.on('data', (data) =>
          String(data).includes('Laminar: Running') ? resolve() : undefined,
        );
      });
      const { data } = await axios.request(config);
      expect(data).toEqual(expected);
    } finally {
      /**
       * Since we need to kill the service and _all of its children_ we need to kill the whole group itself
       * https://azimi.me/2014/12/31/kill-child_process-node-js.html
       */
      service.stderr.off('data', errorLogger);
      process.kill(-service.pid);
    }
  });
});
