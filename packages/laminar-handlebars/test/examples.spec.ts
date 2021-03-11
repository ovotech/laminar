import axios, { AxiosRequestConfig } from 'axios';
import { execSync, spawn } from 'child_process';
import { readdirSync, unlinkSync } from 'fs';
import { join } from 'path';

const examplesDir = join(__dirname, '../examples/');

let port = 5000;

describe('Example files', () => {
  beforeAll(() => execSync('yarn tsc', { cwd: examplesDir }));
  afterAll(() =>
    readdirSync(examplesDir)
      .filter((file) => file.endsWith('.js'))
      .forEach((file) => unlinkSync(join(examplesDir, file))),
  );

  it.each<[string, AxiosRequestConfig, unknown]>([
    [
      'examples/html.ts',
      {
        method: 'GET',
        url: '/',
      },
      `<body>\n  <div>HEADER</div>\n  INDEX\n</body>\n`,
    ],
    [
      'examples/expiry-cache.ts',
      {
        method: 'GET',
        url: '/',
      },
      `<body>\n  <div>HEADER</div>\n  INDEX\n</body>\n`,
    ],
    [
      'examples/direct.ts',
      {
        method: 'GET',
        url: '/',
      },
      `<body>\n  <div>HEADER</div>\n  INDEX\n</body>\n`,
    ],
    [
      'examples/yaml.ts',
      {
        method: 'GET',
        url: '/swagger.yaml',
      },
      `openapi: '3.0.0'\ninfo:\n  version: 10\n`,
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
});
