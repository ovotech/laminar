import axios from 'axios';
import { HttpServer, loggerMiddleware, textOk, run } from '@ovotech/laminar';
import { queueMiddleware, QueueService, QueueSubscriptionService, QueueSubscriptionsService } from '../src';
import * as PgBoss from 'pg-boss';

describe('Integration', () => {
  it('Should work through a queue with a single subscription', async () => {
    const port = 9060;
    const logger = { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() };
    const logging = loggerMiddleware(logger);

    const queue = new QueueService(
      new PgBoss({ connectionString: 'postgres://example-admin:example-pass@localhost:5432/example' }),
    );
    const withQueue = queueMiddleware(queue);

    const worker = new QueueSubscriptionService<string>(queue, {
      name: 'test',
      app: logging(async ({ data, logger }) => {
        logger.info(data);
      }),
      options: { newJobCheckInterval: 100, teamConcurrency: 1, teamSize: 1 },
    });

    const http = new HttpServer({
      port,
      app: withQueue(
        logging(async ({ logger, queue, query: { data } }) => {
          logger.info('test');
          for (const item of data) {
            queue.publish({ name: 'test', data: item });
          }
          return textOk('OK');
        }),
      ),
    });

    await run({ services: [queue, [http, worker]] }, async () => {
      await axios.get(`http://localhost:${port}?data[]=1&data[]=2&data[]=3`);
      await axios.get(`http://localhost:${port}?data[]=4`);

      await new Promise((resolve) => setTimeout(resolve, 3000));
    });

    expect(logger.info).toHaveBeenCalledWith(1);
    expect(logger.info).toHaveBeenCalledWith(2);
    expect(logger.info).toHaveBeenCalledWith(3);
    expect(logger.info).toHaveBeenCalledWith(4);
  });

  it('Should work with multiple subscriptions', async () => {
    const port = 9061;
    const logger = { info: jest.fn(), error: jest.fn(), debug: jest.fn(), warn: jest.fn() };
    const logging = loggerMiddleware(logger);

    const queue = new QueueService(
      new PgBoss({ connectionString: 'postgres://example-admin:example-pass@localhost:5432/example' }),
    );
    const withQueue = queueMiddleware(queue);

    const worker = new QueueSubscriptionsService(queue, [
      {
        name: 'test-1',
        app: logging(async ({ data, logger }) => {
          logger.info('test-1', { data });
        }),
        options: { newJobCheckInterval: 100, teamConcurrency: 1, teamSize: 1 },
      },
      {
        name: 'test-2',
        app: logging(async ({ data, logger }) => {
          logger.info('test-2', { data });
        }),
        options: { newJobCheckInterval: 100, teamConcurrency: 1, teamSize: 1 },
      },
    ]);

    const http = new HttpServer({
      port,
      app: withQueue(
        logging(async ({ logger, queue, query: { name, data } }) => {
          logger.info('test');
          for (const item of data) {
            queue.publish({ name, data: item });
          }
          return textOk('OK');
        }),
      ),
    });

    await run({ services: [queue, [http, worker]] }, async () => {
      await axios.get(`http://localhost:${port}?name=test-1&data[]=1&data[]=2&data[]=3`);
      await axios.get(`http://localhost:${port}?name=test-2&data[]=4`);

      await new Promise((resolve) => setTimeout(resolve, 3000));
    });

    expect(logger.info).toHaveBeenCalledWith('test-1', { data: 1 });
    expect(logger.info).toHaveBeenCalledWith('test-1', { data: 2 });
    expect(logger.info).toHaveBeenCalledWith('test-1', { data: 3 });
    expect(logger.info).toHaveBeenCalledWith('test-2', { data: 4 });
  });
});
