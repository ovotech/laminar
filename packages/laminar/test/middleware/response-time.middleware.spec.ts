import axios from 'axios';
import { HttpService, responseTimeMiddleware, textOk } from '../../src';

const api = axios.create({ baseURL: 'http://localhost:8096' });

describe('responseTimeMiddleware middleware', () => {
  it('Should measure small response time', async () => {
    const responseTime = responseTimeMiddleware();
    const server = new HttpService({
      port: 8096,
      listener: responseTime(async () => {
        await new Promise((resolve) => setTimeout(resolve, 15));
        return textOk('OK');
      }),
    });
    try {
      await server.start();

      const result = await api.get('/test');
      expect(result.status).toBe(200);
      expect(Number(result.headers['x-response-time'])).toBeGreaterThan(14);
      expect(Number(result.headers['x-response-time'])).toBeLessThan(54);
    } finally {
      await server.stop();
    }
  });

  it('Should measure larger response time', async () => {
    const responseTime = responseTimeMiddleware();
    const server = new HttpService({
      port: 8096,
      listener: responseTime(async () => {
        await new Promise((resolve) => setTimeout(resolve, 55));
        return textOk('OK');
      }),
    });
    try {
      await server.start();

      const result = await api.get('/test');

      expect(result.status).toBe(200);
      expect(Number(result.headers['x-response-time'])).toBeGreaterThan(54);
      expect(Number(result.headers['x-response-time'])).toBeLessThan(100);
    } finally {
      await server.stop();
    }
  });

  it('Should use custom header', async () => {
    const responseTime = responseTimeMiddleware({ header: 'My-Time' });
    const server = new HttpService({
      port: 8096,
      listener: responseTime(async () => textOk('OK')),
    });
    try {
      await server.start();

      const result = await api.get('/test');

      expect(result.status).toBe(200);
      expect(Number(result.headers['my-time'])).toBeGreaterThan(0);
      expect(Number(result.headers['my-time'])).toBeLessThan(50);
    } finally {
      await server.stop();
    }
  });
});
