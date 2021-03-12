import axios from 'axios';
import { httpLoggingMiddleware, textOk, HttpServer, LoggerLike } from '../../src';

const api = axios.create({ baseURL: 'http://localhost:8098' });

describe('httpLoggingMiddleware middleware', () => {
  it('Should log error', async () => {
    const mockLogger: LoggerLike = {
      info: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
    };

    const logging = httpLoggingMiddleware(mockLogger);
    const server = new HttpServer({
      port: 8098,
      app: logging(() => {
        throw new Error('Test Error');
      }),
    });
    try {
      await server.start();

      await expect(api.get('/test/23').catch((error) => error.response)).resolves.toMatchObject({
        status: 500,
      });

      await expect(
        api.post('/test/10', { data: 1 }, { headers: { 'x-trace-token': 'test-1' } }).catch((error) => error.response),
      ).resolves.toMatchObject({
        status: 500,
      });

      expect(mockLogger.error).toHaveBeenNthCalledWith(1, 'Error: Test Error [GET /test/23]', {
        message: 'Test Error',
        stack: expect.any(String),
      });

      expect(mockLogger.error).toHaveBeenNthCalledWith(2, 'Error: Test Error [POST /test/10]', {
        message: 'Test Error',
        stack: expect.any(String),
        traceToken: 'test-1',
      });
    } finally {
      await server.stop();
    }
  });

  it('Should log response', async () => {
    const mockLogger: LoggerLike = {
      info: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
    };
    const logging = httpLoggingMiddleware(mockLogger);

    const server = new HttpServer({
      port: 8098,
      app: logging(async () => textOk('OK')),
    });

    try {
      await server.start();

      await expect(api.get('/test/23')).resolves.toMatchObject({
        status: 200,
        data: 'OK',
      });

      expect(mockLogger.info).toHaveBeenNthCalledWith(1, 'Status: 200 [GET /test/23]');

      expect(mockLogger.info).toHaveBeenCalledTimes(1);
      expect(mockLogger.error).not.toHaveBeenCalled();
    } finally {
      await server.stop();
    }
  });
});
