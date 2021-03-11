import { spawn, execSync } from 'child_process';
import { join } from 'path';
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

let port = 4300;

describe('Docs examples', () => {
  beforeAll(() => execSync('yarn build'));

  it.each<[string, Array<{ req: AxiosRequestConfig; res: Partial<AxiosResponse> }>]>([
    [
      'src/app.ts',
      [
        {
          req: { url: '/users/3' },
          res: { status: 200, data: { accessedUrl: '/users/3' } },
        },
      ],
    ],
    [
      'src/server.ts',
      [
        {
          req: { method: 'GET', url: 'http://localhost:4399/users/3' },
          res: { status: 200, data: { id: '3', name: 'John' } },
        },
      ],
    ],
    [
      'src/cors.ts',
      [
        {
          req: {
            method: 'OPTIONS',
            url: '/user/3',
            headers: { Origin: 'http://example.com' },
          },
          res: {
            headers: {
              'access-control-allow-origin': 'http://example.com',
              'access-control-allow-methods': 'GET,HEAD,PUT,PATCH,POST,DELETE',
            },
          },
        },
      ],
    ],
    [
      'src/router.ts',
      [
        {
          req: { url: '/blog/1/authors/20' },
          res: { status: 200, data: ['Hapiness', 'Bob'] },
        },
      ],
    ],
    [
      'src/router-regex.ts',
      [
        {
          req: { url: '/names/10' },
          res: { status: 200, data: 'Dave' },
        },
      ],
    ],
    [
      'src/static-assets.ts',
      [
        {
          req: { url: '/.well-known/health-check' },
          res: { status: 200 },
        },
        {
          req: { url: '/my-assets/star.svg' },
          res: { status: 200 },
        },
        {
          req: { url: '/my-assets/svg.svg' },
          res: { status: 200 },
        },
        {
          req: { url: '/my-assets/other.txt' },
          res: { status: 404, data: 'File not found' },
        },
      ],
    ],
    [
      'src/static-assets-options.ts',
      [
        {
          req: { url: '/.well-known/health-check' },
          res: { status: 200 },
        },
        {
          req: { url: '/my-assets/star.svg' },
          res: { status: 200 },
        },
        {
          req: { url: '/my-assets/svg.svg' },
          res: { status: 200 },
        },
        {
          req: { url: '/my-assets/other.txt' },
          res: { status: 404, data: '<html>No File</html>' },
        },
      ],
    ],
    [
      'src/custom-body-parser.ts',
      [
        {
          req: {
            url: '/test/star',
            method: 'POST',
            data: 'test: { one: "other" }',
            headers: { 'content-type': 'application/yaml' },
          },
          res: { status: 200, data: { test: { one: 'other' } } },
        },
      ],
    ],
    [
      'src/custom-response-parser.ts',
      [
        {
          req: { url: '/test/star.yaml' },
          res: { status: 200, data: 'example:\n  test: msg\n' },
        },
      ],
    ],
    [
      'src/custom-error-handler.ts',
      [
        {
          req: { url: '/test/star.yaml' },
          res: { status: 500, data: '<html>Testing error</html>' },
        },
      ],
    ],
    [
      'src/cors-regex.ts',
      [
        {
          req: { method: 'OPTIONS', url: '/test', headers: { Origin: 'https://localhost' } },
          res: {
            status: 204,
            headers: {
              'access-control-allow-origin': 'https://localhost',
              'access-control-allow-methods': 'GET,HEAD,PUT,PATCH,POST,DELETE',
            },
          },
        },
      ],
    ],
    [
      'src/cors-function.ts',
      [
        {
          req: { method: 'OPTIONS', url: '/test', headers: { Origin: 'https://example.com' } },
          res: {
            status: 204,
            headers: {
              'access-control-allow-origin': 'https://example.com',
              'access-control-allow-methods': 'GET,HEAD,PUT,PATCH,POST,DELETE',
            },
          },
        },
      ],
    ],
    [
      'src/cors-options.ts',
      [
        {
          req: { method: 'OPTIONS', url: '/test', headers: { Origin: 'https://localhost' } },
          res: {
            status: 204,
            headers: {
              'access-control-allow-origin': 'http://localhost',
              'access-control-allow-credentials': 'true',
              'access-control-allow-methods': 'POST,GET',
              'access-control-allow-headers': 'Authorization,X-Authorization',
            },
          },
        },
      ],
    ],
  ])('Should work for %s', async (file, testConfigs) => {
    port += 1;
    const jsFile = file.replace('src', 'dist').replace('.ts', '.js');

    const service = spawn('yarn', ['node', jsFile], {
      cwd: join(__dirname, '..'),
      detached: true,
      env: { ...process.env, LAMINAR_HTTP_PORT: String(port) },
    });

    try {
      service.stderr.on('data', (data) => console.error(String(data)));
      await new Promise((resolve) => {
        service.stdout.on('data', (data) => (String(data).includes('Started') ? resolve(undefined) : undefined));
      });

      const api = axios.create({ baseURL: `http://localhost:${port}` });

      for (const { req, res } of testConfigs) {
        const apiRes = await api.request(req).catch((error) => {
          if (error.response) {
            return error.response;
          } else {
            throw error;
          }
        });
        expect(apiRes).toMatchObject(res);
      }
    } finally {
      /**
       * Since we need to kill the service and _all of its children_ we need to kill the whole group itself
       * https://azimi.me/2014/12/31/kill-child_process-node-js.html
       */
      process.kill(-service.pid);
    }
  });
});
