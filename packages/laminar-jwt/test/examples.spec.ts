import axios, { AxiosRequestConfig } from 'axios';
import axiosCookieJarSupport from 'axios-cookiejar-support';
import { execSync, spawn } from 'child_process';
import { URLSearchParams } from 'url';
import { join } from 'path';
import { CookieJar } from 'tough-cookie';
import { readdirSync, unlinkSync } from 'fs';

const examplesDir = join(__dirname, '../examples/');

let port = 5000;

describe('Example files', () => {
  beforeAll(() => execSync('yarn tsc', { cwd: examplesDir }));
  afterAll(() =>
    readdirSync(examplesDir)
      .filter((file) => file.endsWith('.js'))
      .forEach((file) => unlinkSync(join(examplesDir, file))),
  );

  it.each<[string, AxiosRequestConfig, AxiosRequestConfig, unknown]>([
    [
      'examples/jwk.ts',
      {
        method: 'POST',
        url: '/session',
        data: { email: 'test@example.com', scopes: ['admin'] },
      },
      {
        method: 'POST',
        url: '/test',
      },
      {
        result: 'ok',
        user: { email: 'test@example.com', iat: expect.any(Number), scopes: ['admin'] },
      },
    ],
    [
      'examples/keycloak.ts',
      {
        method: 'POST',
        url: '/session',
        data: {
          email: 'test@example.com',
          resource_access: { 'my-service-name': { roles: ['admin'] } },
        },
      },
      {
        method: 'POST',
        url: '/test',
      },
      {
        result: 'ok',
        user: {
          email: 'test@example.com',
          iat: expect.any(Number),
          resource_access: { 'my-service-name': { roles: ['admin'] } },
        },
      },
    ],
    [
      'examples/keypair.ts',
      {
        method: 'POST',
        url: '/session',
        data: { email: 'test@example.com', scopes: ['admin'] },
      },
      {
        method: 'POST',
        url: '/test',
      },
      {
        result: 'ok',
        user: { email: 'test@example.com', iat: expect.any(Number), scopes: ['admin'] },
      },
    ],
    [
      'examples/oapi-keycloak.ts',
      {
        method: 'POST',
        url: '/session',
        data: {
          email: 'test@example.com',
          resource_access: { 'my-service-name': { roles: ['admin'] } },
        },
      },
      {
        method: 'POST',
        url: '/test',
      },
      {
        text: 'ok',
        user: {
          email: 'test@example.com',
          iat: expect.any(Number),
          resource_access: { 'my-service-name': { roles: ['admin'] } },
        },
      },
    ],
    [
      'examples/oapi.ts',
      {
        method: 'POST',
        url: '/session',
        data: { email: 'test@example.com', scopes: ['admin'] },
      },
      {
        method: 'POST',
        url: '/test',
      },
      {
        text: 'ok',
        user: { email: 'test@example.com', iat: expect.any(Number), scopes: ['admin'] },
      },
    ],
    [
      'examples/oapi-api-key.ts',
      {
        method: 'POST',
        url: '/session',
        data: new URLSearchParams({ email: 'test@example.com' }),
      },
      {
        method: 'POST',
        url: '/test',
        data: '',
      },
      'OK test@example.com',
    ],
    [
      'examples/oapi-custom.ts',
      {
        method: 'POST',
        url: '/session',
        data: new URLSearchParams({ email: 'test@example.com' }),
      },
      {
        method: 'POST',
        url: '/test',
        data: '',
      },
      'OK test@example.com',
    ],
    [
      'examples/simple.ts',
      {
        method: 'POST',
        url: '/session',
        data: { email: 'test@example.com', scopes: ['admin'] },
      },
      {
        method: 'POST',
        url: '/test',
      },
      {
        result: 'ok',
        user: { email: 'test@example.com', iat: expect.any(Number), scopes: ['admin'] },
      },
    ],
  ])('Should process %s', async (file, jwtRequest, testRequest, expected) => {
    port += 1;
    const service = spawn('yarn', ['node', file.replace('.ts', '.js')], {
      cwd: join(__dirname, '..'),
      detached: true,
      env: { ...process.env, LAMINAR_HTTP_PORT: String(port) },
    });
    const errorLogger = (data: Buffer): void => console.error(data.toString());
    const jar = new CookieJar();

    try {
      service.stderr.on('data', errorLogger);
      await new Promise((resolve) => {
        service.stdout.on('data', (data) => (String(data).includes('Started') ? resolve(undefined) : undefined));
      });
      const api = axiosCookieJarSupport(axios.create({ baseURL: `http://localhost:${port}` }));
      const jwtResponse = await api.request({ ...jwtRequest, jar });

      if (typeof jwtResponse.data !== 'string') {
        expect(jwtResponse.data).toMatchObject({ jwt: expect.any(String) });
      }
      const headers = { Authorization: `Bearer ${jwtResponse.data.jwt}` };
      const { data } = await api.request({ ...testRequest, headers, withCredentials: true, jar });
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
