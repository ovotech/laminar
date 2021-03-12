import { LoggerLike } from './logger';
import { Service } from './types';

export type ContextItem = Service | ContextItem[];

export const startService = async (item: Service, logger?: LoggerLike): Promise<void> => {
  logger?.info(`⏫ Starting ${item.describe()}`);
  await item.start();
  logger?.info(`✅ Started ${item.describe()}`);
};

export const stopService = async (item: Service, logger?: LoggerLike): Promise<void> => {
  logger?.info(`⏬ Stopping ${item.describe()}`);
  await item.stop();
  logger?.info(`❎ Stopped ${item.describe()}`);
};

export async function start(contextItems: ContextItem[], logger?: LoggerLike): Promise<void> {
  for (const item of contextItems) {
    await ('start' in item
      ? startService(item, logger)
      : Promise.all(item.map((child) => ('start' in child ? startService(child, logger) : start(child, logger)))));
  }
}

export async function stop(contextItems: ContextItem[], logger?: LoggerLike): Promise<void> {
  for (const item of contextItems.reverse()) {
    await ('stop' in item
      ? stopService(item, logger)
      : Promise.all(item.map((child) => ('stop' in child ? stopService(child, logger) : start(child, logger)))));
  }
}

export function stopOnSignal(signal: NodeJS.Signals, contextItems: ContextItem[], logger?: LoggerLike): void {
  const onSIGTERM = () => {
    stop(contextItems, logger);
    process.off(signal, onSIGTERM);
  };
  process.on(signal, onSIGTERM);
}

export async function init(contextItems: ContextItem[], logger?: LoggerLike): Promise<void> {
  await start(contextItems, logger);
  stopOnSignal('SIGTERM', contextItems, logger);
}
