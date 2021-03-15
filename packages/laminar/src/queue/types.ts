import { AbstractMiddleware, Empty } from '../types';
import type { PublishOptions, SubscribeOptions } from 'pg-boss';

export interface Publish<TData extends Empty = Empty> {
  name: string;
  data?: TData;
  options?: PublishOptions;
}

export interface JobData<TData = any> {
  data: TData;
  id: string;
  name: string;
  queue: Queue;
}

export type WorkerMiddleware<TProvide extends Empty = Empty, TRequire extends Empty = Empty> = AbstractMiddleware<
  JobData,
  void,
  TProvide,
  TRequire
>;

export type JobWorker<TData extends Empty, TContext extends Empty = Empty> = (
  data: JobData<TData> & TContext,
) => Promise<void>;

export interface Subscribe<TData extends Empty = Empty, TContext extends Empty = Empty> {
  name: string;
  worker: JobWorker<TData, TContext>;
  options?: SubscribeOptions;
}

export interface Queue {
  publish<TData>(request: Publish<TData>): Promise<string | null>;
  subscribe<TData>(request: Subscribe<TData>): Promise<void>;
  unsubscribe(name: string): Promise<boolean>;
}
