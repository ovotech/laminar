import axios from 'axios';
import { HttpService, textOk, Middleware, run } from '../src';
import { SimpleQueue, Boss } from './simple-queue';

export interface BossContext<TData> {
  boss: Boss<TData>;
}
export const bossMiddleware = <TData>(boss: Boss<TData>): Middleware<BossContext<TData>> => (next) => (ctx) =>
  next({ ...ctx, boss });

describe('Services', () => {
  it('Should start and stop services', async () => {
    const port = 8060;
    const logger = { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() };
    const boss = new Boss<number>();

    const withBoss = bossMiddleware(boss);

    const queue = new SimpleQueue<number>(boss, [
      {
        queue: 'one',
        app: async ({ data }) => logger.info(String(data)),
      },
    ]);

    const http = new HttpService({
      port,
      listener: withBoss(async ({ boss, query: { data } }) => {
        logger.info('test');
        for (const item of data) {
          boss.add('one', Number(item));
        }
        return textOk('OK');
      }),
    });

    await run({ services: [boss, [http, queue]], logger }, async () => {
      await axios.get(`http://localhost:${port}?data[]=1&data[]=2&data[]=3`);
      await axios.get(`http://localhost:${port}?data[]=4`);

      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    expect(logger.info.mock.calls).toEqual([
      ['⏫ Starting Boss'],
      ['✅ Started Boss'],
      ['⏫ Starting ⛲ Laminar: http://localhost:8060'],
      ['⏫ Starting Queue: one'],
      ['✅ Started Queue: one'],
      ['✅ Started ⛲ Laminar: http://localhost:8060'],
      ['test'],
      ['1'],
      ['2'],
      ['3'],
      ['test'],
      ['4'],
      ['⏬ Stopping ⛲ Laminar: http://localhost:8060'],
      ['⏬ Stopping Queue: one'],
      ['❎ Stopped Queue: one'],
      ['❎ Stopped ⛲ Laminar: http://localhost:8060'],
      ['⏬ Stopping Boss'],
      ['❎ Stopped Boss'],
    ]);
  });
});
