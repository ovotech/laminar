import axios from 'axios';
import { loggingMiddleware, LoggerFormatters, textOk, HttpServer, LoggerLike } from '../../src';

const api = axios.create({ baseURL: 'http://localhost:8098' });

describe('loggingMiddleware middleware', () => {
  it('Should log path and method ', async () => {
    const mockLogger: LoggerLike = {
      info: jest.fn(),
      error: jest.fn(),
      log: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
    };

    const logging = loggingMiddleware(mockLogger);
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

      expect(mockLogger.info).toHaveBeenNthCalledWith(1, 'Request', {
        request: 'GET /test/23',
        contentType: undefined,
      });

      expect(mockLogger.error).toHaveBeenNthCalledWith(1, 'Error', {
        message: 'Test Error',
        stack: expect.any(String),
        request: 'GET /test/23',
      });
    } finally {
      await server.stop();
    }
  });

  it('Should not call error logger on success', async () => {
    const mockLogger: LoggerLike = {
      info: jest.fn(),
      error: jest.fn(),
      log: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
    };
    const logging = loggingMiddleware(mockLogger);

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

      expect(mockLogger.info).toHaveBeenNthCalledWith(1, 'Request', {
        request: 'GET /test/23',
        contentType: undefined,
      });

      expect(mockLogger.info).toHaveBeenNthCalledWith(2, 'Response', {
        contentType: 'text/plain',
        status: 200,
        request: 'GET /test/23',
      });

      expect(mockLogger.info).toHaveBeenCalledTimes(2);
      expect(mockLogger.error).not.toHaveBeenCalled();
    } finally {
      await server.stop();
    }
  });

  it('Should log other things with a custom function', async () => {
    const mockLogger: LoggerLike = {
      info: jest.fn(),
      error: jest.fn(),
      log: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
    };
    const errorFormatter: LoggerFormatters['error'] = (req, error) => {
      return {
        message: `MY ${error.message}`,
      };
    };
    const logging = loggingMiddleware(mockLogger, { error: errorFormatter });
    const server = new HttpServer({
      port: 8098,
      app: logging(async () => {
        throw new Error('Other Error');
      }),
    });
    try {
      await server.start();

      await expect(api.get('/test/23?test=other').catch((error) => error.response)).resolves.toMatchObject({
        status: 500,
      });

      expect(mockLogger.error).toHaveBeenNthCalledWith(1, 'Error', {
        message: 'MY Other Error',
      });
    } finally {
      await server.stop();
    }
  });
});
