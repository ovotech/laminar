import { Middleware } from '@ovotech/laminar';
import { Queue } from './types';

export interface QueueContext {
  queue: Queue;
}

export const queueMiddleware = (queue: Queue): Middleware<QueueContext> => (next) => (ctx) => next({ ...ctx, queue });
