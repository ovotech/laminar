import axios from 'axios';
import { HttpServer, LoggerLike, textOk, Middleware, start, stop } from '../src';
import { SimpleQueue, Boss } from './simple-queue';

export interface LoggerContext {
  logger: LoggerLike;
}

export interface BossContext<TData> {
  boss: Boss<TData>;
}

export const loggerMiddleware = (logger: LoggerLike): Middleware<LoggerContext> => (next) => (ctx) =>
  next({ ...ctx, logger });

export const bossMiddleware = <TData>(boss: Boss<TData>): Middleware<BossContext<TData>> => (next) => (ctx) =>
  next({ ...ctx, boss });

describe('Services', () => {
  it('Should start and stop services', async () => {
    const port = 8060;
    const loggerMock = { info: jest.fn(), error: jest.fn(), log: jest.fn(), warn: jest.fn(), debug: jest.fn() };
    const boss = new Boss<number>();

    const withBoss = bossMiddleware(boss);
    const logging = loggerMiddleware(loggerMock);

    const queue = new SimpleQueue<number>(boss, [
      {
        queue: 'one',
        app: logging(async ({ data, logger }) => logger.info(String(data))),
      },
    ]);

    const http = new HttpServer({
      port,
      app: withBoss(
        logging(async ({ logger, boss, query: { data } }) => {
          logger.info('test');
          for (const item of data) {
            boss.add('one', Number(item));
          }
          return textOk('OK');
        }),
      ),
    });

    const services = [boss, [http, queue]];

    try {
      await start(services, loggerMock);

      await axios.get(`http://localhost:${port}?data[]=1&data[]=2&data[]=3`);
      await axios.get(`http://localhost:${port}?data[]=4`);

      await new Promise((resolve) => setTimeout(resolve, 100));
    } finally {
      await stop(services, loggerMock);

      expect(loggerMock.info.mock.calls).toEqual([
        ['⏫ Starting Boss'],
        ['✅ Started Boss'],
        ['⏫ Starting ⛲ Laminar: null'],
        ['⏫ Starting Queue: one'],
        ['✅ Started Queue: one'],
        ['✅ Started ⛲ Laminar: 127.0.0.1:8060 (IPv4)'],
        ['test'],
        ['1'],
        ['2'],
        ['3'],
        ['test'],
        ['4'],
        ['⏬ Stopping ⛲ Laminar: 127.0.0.1:8060 (IPv4)'],
        ['⏬ Stopping Queue: one'],
        ['❎ Stopped Queue: one'],
        ['❎ Stopped ⛲ Laminar: null'],
        ['⏬ Stopping Boss'],
        ['❎ Stopped Boss'],
      ]);
    }
  });
});
