import { AxiosError } from './http/axios-error';
import { LoggerLike } from './logger';
import { Service } from './types';

export type NestedService = Service | NestedService[];
export interface Application {
  services: NestedService[];
  logger?: LoggerLike | (LoggerLike & Service);
}

const startService = async (item: Service, logger?: LoggerLike | (LoggerLike & Service)): Promise<void> => {
  logger?.info(`⏫ Starting ${item.describe()}`);
  await item.start();
  logger?.info(`✅ Started ${item.describe()}`);
};

const stopService = async (item: Service, logger?: LoggerLike | (LoggerLike & Service)): Promise<void> => {
  logger?.info(`⏬ Stopping ${item.describe()}`);
  await item.stop();
  if (item !== logger) {
    logger?.info(`❎ Stopped ${item.describe()}`);
  }
};

export async function start({ services, logger }: Application): Promise<void> {
  for (const item of services) {
    await ('start' in item
      ? startService(item, logger)
      : Promise.all(
          item.map((child) => ('start' in child ? startService(child, logger) : start({ services: child, logger }))),
        ));
  }
}

export async function stop({ services, logger }: Application): Promise<void> {
  for (const item of services.reverse()) {
    await ('stop' in item
      ? stopService(item, logger)
      : Promise.all(
          item.map((child) => ('stop' in child ? stopService(child, logger) : start({ services: child, logger }))),
        ));
  }
}

export function stopOnSignal(signal: NodeJS.Signals, services: Application): void {
  const onSIGTERM = async () => {
    process.off(signal, onSIGTERM);
    await stop(services);
  };
  process.on(signal, onSIGTERM);
}

export async function init<TApplication extends Application>(context: TApplication): Promise<TApplication> {
  await start(context);
  stopOnSignal('SIGTERM', context);
  return context;
}

export async function run(context: Application, predicate: (context: Application) => Promise<void>): Promise<void> {
  await start(context);
  try {
    await predicate(context);
  } catch (error) {
    throw error.response ? new AxiosError(error.response.status, error.response.data, error.stack) : error;
  } finally {
    await stop(context);
  }
}
