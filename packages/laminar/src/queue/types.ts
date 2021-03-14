import { Empty } from '../types';
import type { PublishOptions, SubscribeOptions } from 'pg-boss';

export interface Publish<TData extends Empty = Empty> {
  name: string;
  data?: TData;
  options?: PublishOptions;
}

export interface JobData<TData> {
  data: TData;
  id: string;
  name: string;
  queue: Queue;
}

export type JobHandler<TData extends Empty, TRequest extends Empty = Empty> = (
  data: JobData<TData> & TRequest,
) => Promise<void>;

export interface Subscribe<TData extends Empty = Empty, TRequest extends Empty = Empty> {
  name: string;
  app: JobHandler<TData, TRequest>;
  options?: SubscribeOptions;
}

export interface Queue {
  publish(request: Publish): Promise<string | null>;
  subscribe<TData>(request: Subscribe<TData>): Promise<void>;
  unsubscribe(name: string): Promise<boolean>;
}
