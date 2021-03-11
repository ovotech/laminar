import axios, { AxiosRequestConfig } from 'axios';
import { exec, execSync, spawn } from 'child_process';
import { readdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import { promisify } from 'util';

const examplesDir = join(__dirname, '../examples/');

let port = 4900;

describe('Example files', () => {
  beforeAll(() => execSync('yarn tsc', { cwd: examplesDir }));
  afterAll(() => {
    readdirSync(examplesDir)
      .filter((file) => file.endsWith('.js'))
      .forEach((file) => unlinkSync(join(examplesDir, file)));

    readdirSync(join(examplesDir, '__generated__'))
      .filter((file) => file.endsWith('.js'))
      .forEach((file) => unlinkSync(join(examplesDir, '__generated__', file)));
  });

  it.each<[string, AxiosRequestConfig, unknown]>([
    [
      'examples/api.ts',
      {
        method: 'GET',
        url: '/test',
      },
      { text: 'ok', user: { email: 'me@example.com' } },
    ],
    [
      'examples/convertion.ts',
      {
        method: 'GET',
        url: '/user',
      },
      { email: 'me@example.com', createdAt: '2020-01-01T12:00:00.000Z' },
    ],
  ])('Should process %s', async (file, config, expected) => {
    port += 1;
    const service = spawn('yarn', ['node', file.replace('.ts', '.js')], {
      cwd: join(__dirname, '..'),
      detached: true,
      env: { ...process.env, LAMINAR_HTTP_PORT: String(port) },
    });
    const errorLogger = (data: Buffer): void => console.error(data.toString());

    try {
      service.stderr.on('data', errorLogger);
      await new Promise((resolve) => {
        service.stdout.on('data', (data) => (String(data).includes('Started') ? resolve(undefined) : undefined));
      });
      const { data } = await axios.create({ baseURL: `http://localhost:${port}` }).request(config);
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

  it.each<[string, string]>([
    ['examples/axios.ts', `{ text: 'test', user: { email: 'test@example.com' } }`],
    // ['examples/axios-petstore.ts', `INVENTORY`],
  ])('Should process %s', async (file, expected) => {
    const { stdout, stderr } = await promisify(exec)(`yarn node ${file.replace('.ts', '.js')}`, {
      cwd: join(__dirname, '..'),
    });

    expect(stderr).toBe('');
    expect(stdout).toContain(expected);
  });
});
