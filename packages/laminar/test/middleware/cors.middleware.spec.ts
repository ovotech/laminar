import axios, { AxiosResponse } from 'axios';
import { HttpService, corsMiddleware, jsonOk, HttpListener } from '../../src';

const api = axios.create({ baseURL: 'http://localhost:8095' });

const listener: HttpListener = async () => jsonOk({ health: 'ok' });

describe('Cors middleware', () => {
  it('Should allow all by default', async () => {
    const cors = corsMiddleware();
    const server = new HttpService({ port: 8095, listener: cors(listener) });
    try {
      await server.start();

      await expect(api.get('/test')).resolves.toMatchObject({
        status: 200,
        data: { health: 'ok' },
        headers: expect.objectContaining({
          'access-control-allow-origin': '*',
        }),
      });

      await expect(api.request({ url: '/test', method: 'OPTIONS' })).resolves.toMatchObject({
        status: 204,
        data: '',
        headers: expect.objectContaining({
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'GET,HEAD,PUT,PATCH,POST,DELETE',
        }),
      });
    } finally {
      await server.stop();
    }
  });

  it('Should add headers on async responses', async () => {
    const cors = corsMiddleware();
    const server = new HttpService({ port: 8095, listener: cors(listener) });
    try {
      await server.start();

      await expect(api.get('/test')).resolves.toMatchObject({
        status: 200,
        data: { health: 'ok' },
        headers: expect.objectContaining({
          'access-control-allow-origin': '*',
        }),
      });

      await expect(api.request({ url: '/test', method: 'OPTIONS' })).resolves.toMatchObject({
        status: 204,
        data: '',
        headers: expect.objectContaining({
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'GET,HEAD,PUT,PATCH,POST,DELETE',
        }),
      });
    } finally {
      await server.stop();
    }
  });

  it('Should be able to change allowed methods', async () => {
    const cors = corsMiddleware({ allowMethods: ['GET', 'POST', 'DELETE'] });
    const server = new HttpService({ port: 8095, listener: cors(listener) });
    try {
      await server.start();

      await expect(api.get('/test')).resolves.toMatchObject({
        status: 200,
        data: { health: 'ok' },
        headers: expect.objectContaining({
          'access-control-allow-origin': '*',
        }),
      });

      await expect(api.request({ url: '/test', method: 'OPTIONS' })).resolves.toMatchObject({
        status: 204,
        data: '',
        headers: expect.objectContaining({
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'GET,POST,DELETE',
        }),
      });
    } finally {
      await server.stop();
    }
  });

  it('Should be able to change allowed credentials', async () => {
    const cors = corsMiddleware({ allowCredentials: true });
    const server = new HttpService({ port: 8095, listener: cors(listener) });
    try {
      await server.start();

      await expect(api.get('/test')).resolves.toMatchObject({
        status: 200,
        data: { health: 'ok' },
        headers: expect.objectContaining({
          'access-control-allow-origin': '*',
          'access-control-allow-credentials': 'true',
        }),
      });

      await expect(api.request({ url: '/test', method: 'OPTIONS' })).resolves.toMatchObject({
        status: 204,
        data: '',
        headers: expect.objectContaining({
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'GET,HEAD,PUT,PATCH,POST,DELETE',
          'access-control-allow-credentials': 'true',
        }),
      });
    } finally {
      await server.stop();
    }
  });

  it('Should be able to set max age', async () => {
    const cors = corsMiddleware({ maxAge: 1200 });
    const server = new HttpService({ port: 8095, listener: cors(listener) });
    try {
      await server.start();

      await expect(api.get('/test')).resolves.toMatchObject({
        status: 200,
        data: { health: 'ok' },
        headers: expect.objectContaining({
          'access-control-allow-origin': '*',
        }),
      });

      await expect(api.request({ url: '/test', method: 'OPTIONS' })).resolves.toMatchObject({
        status: 204,
        data: '',
        headers: expect.objectContaining({
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'GET,HEAD,PUT,PATCH,POST,DELETE',
          'access-control-max-age': '1200',
        }),
      });
    } finally {
      await server.stop();
    }
  });

  it('Should be able to set exposed headers', async () => {
    const cors = corsMiddleware({ exposeHeaders: ['Authentication', 'Content-Type'] });
    const server = new HttpService({ port: 8095, listener: cors(listener) });
    try {
      await server.start();

      await expect(api.get('/test')).resolves.toMatchObject({
        status: 200,
        data: { health: 'ok' },
        headers: expect.objectContaining({
          'access-control-allow-origin': '*',
          'access-control-expose-headers': 'Authentication,Content-Type',
        }),
      });

      await expect(api.request({ url: '/test', method: 'OPTIONS' })).resolves.toMatchObject({
        status: 204,
        data: '',
        headers: expect.objectContaining({
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'GET,HEAD,PUT,PATCH,POST,DELETE',
          'access-control-expose-headers': 'Authentication,Content-Type',
        }),
      });
    } finally {
      await server.stop();
    }
  });

  it('Should be able to set allowed headers directly', async () => {
    const cors = corsMiddleware({ allowHeaders: ['Authentication', 'Content-Type'] });
    const server = new HttpService({ port: 8095, listener: cors(listener) });
    try {
      await server.start();

      await expect(api.request({ url: '/test', method: 'OPTIONS' })).resolves.toMatchObject({
        status: 204,
        data: '',
        headers: expect.objectContaining({
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'GET,HEAD,PUT,PATCH,POST,DELETE',
          'access-control-allow-headers': 'Authentication,Content-Type',
        }),
      });
    } finally {
      await server.stop();
    }
  });

  it('Should be able to infer allowed headers from request headers', async () => {
    const cors = corsMiddleware();
    const server = new HttpService({ port: 8095, listener: cors(listener) });
    try {
      await server.start();

      await expect(
        api.request({
          url: '/test',
          method: 'OPTIONS',
          headers: { 'access-control-request-headers': 'Authentication,Content-Type' },
        }),
      ).resolves.toMatchObject({
        status: 204,
        data: '',
        headers: expect.objectContaining({
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'GET,HEAD,PUT,PATCH,POST,DELETE',
          'access-control-allow-headers': 'Authentication,Content-Type',
        }),
      });
    } finally {
      await server.stop();
    }
  });

  it('Should be able to set origin as string', async () => {
    const cors = corsMiddleware({ allowOrigin: '127.0.0.1' });
    const server = new HttpService({ port: 8095, listener: cors(listener) });
    try {
      await server.start();

      await expect(api.get('/test', { headers: { origin: '127.0.0.1' } })).resolves.toMatchObject({
        status: 200,
        data: { health: 'ok' },
        headers: expect.objectContaining({ 'access-control-allow-origin': '127.0.0.1' }),
      });
    } finally {
      await server.stop();
    }
  });

  it('Should be able to set origin as array', async () => {
    const cors = corsMiddleware({ allowOrigin: ['127.0.0.1', '127.0.0.2'] });
    const server = new HttpService({ port: 8095, listener: cors(listener) });
    try {
      await server.start();

      await expect(api.get('/test', { headers: { origin: '127.0.0.1' } })).resolves.toMatchObject({
        status: 200,
        data: { health: 'ok' },
        headers: expect.objectContaining({
          'access-control-allow-origin': '127.0.0.1',
        }),
      });

      await expect(api.get('/test', { headers: { origin: '127.0.0.2' } })).resolves.toMatchObject({
        status: 200,
        data: { health: 'ok' },
        headers: expect.objectContaining({
          'access-control-allow-origin': '127.0.0.2',
        }),
      });

      await expect(api.get('/test', { headers: { origin: '127.0.0.3' } })).resolves.toMatchObject({
        status: 200,
        data: { health: 'ok' },
        headers: expect.objectContaining({
          'access-control-allow-origin': 'Error, 127.0.0.3 was not one of 127.0.0.1, 127.0.0.2',
        }),
      });

      await expect(api.get('/test')).resolves.toMatchObject({
        status: 200,
        data: { health: 'ok' },
        headers: expect.objectContaining({
          'access-control-allow-origin': 'Error matching origin header, none found',
        }),
      });
    } finally {
      await server.stop();
    }
  });

  it('Should be able to set origin as regex', async () => {
    const cors = corsMiddleware({ allowOrigin: /127\.0\.0\.\d/ });
    const server = new HttpService({ port: 8095, listener: cors(listener) });
    try {
      await server.start();

      await expect(api.get('/test', { headers: { origin: '127.0.0.1' } })).resolves.toMatchObject({
        status: 200,
        data: { health: 'ok' },
        headers: expect.objectContaining({
          'access-control-allow-origin': '127.0.0.1',
        }),
      });

      await expect(api.get('/test', { headers: { origin: '127.0.0.5' } })).resolves.toMatchObject({
        status: 200,
        data: { health: 'ok' },
        headers: expect.objectContaining({
          'access-control-allow-origin': '127.0.0.5',
        }),
      });

      await expect(api.get('/test', { headers: { origin: '127.0.1.1' } })).resolves.toMatchObject({
        status: 200,
        data: { health: 'ok' },
        headers: expect.objectContaining({
          'access-control-allow-origin': 'Error, 127.0.1.1 did not match /127\\.0\\.0\\.\\d/',
        }),
      });
    } finally {
      await server.stop();
    }
  });

  it('Should be able to set origin as function', async () => {
    const cors = corsMiddleware({ allowOrigin: (origin) => origin === '127.0.0.3' });
    const server = new HttpService({ port: 8095, listener: cors(listener) });
    try {
      await server.start();

      await expect(api.get('/test', { headers: { origin: '127.0.0.3' } })).resolves.toMatchObject({
        status: 200,
        data: { health: 'ok' },
        headers: expect.objectContaining({
          'access-control-allow-origin': '127.0.0.3',
        }),
      });

      await expect(api.get('/test', { headers: { origin: '127.0.0.1' } })).resolves.toMatchObject({
        status: 200,
        data: { health: 'ok' },
        headers: expect.objectContaining({
          'access-control-allow-origin': 'Error, 127.0.0.1 did not match cors function',
        }),
      });
    } finally {
      await server.stop();
    }
  });

  it('Should assign headers even if there is an error', async () => {
    const listener: HttpListener = async () => jsonOk(JSON.parse('{'));
    const cors = corsMiddleware({ allowOrigin: '*' });
    const server = new HttpService({ port: 8095, listener: cors(listener) });

    try {
      await server.start();

      const error: AxiosResponse = await api
        .get('/test', { headers: { origin: '127.0.0.1' } })
        .catch((error) => error.response);

      expect(error.headers).toHaveProperty('access-control-allow-origin', '*');
    } finally {
      await server.stop();
    }
  });
});
