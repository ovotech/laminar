/* eslint-disable @typescript-eslint/ban-types */
import { PublishOptions, SubscribeOptions } from 'pg-boss';

export interface Publish<ReqData = object> {
  name: string;
  data?: ReqData;
  options?: PublishOptions;
}

export interface JobData<ReqData> {
  data: ReqData;
  id: string;
  name: string;
  queue: Queue;
}

export type JobHandler<ReqData> = (data: JobData<ReqData>) => Promise<void>;

export interface Subscribe<ReqData = object> {
  name: string;
  app: JobHandler<ReqData>;
  options?: SubscribeOptions;
}

export interface Queue {
  publish(request: Publish): Promise<string | null>;
  subscribe<ReqData>(request: Subscribe<ReqData>): Promise<void>;
  unsubscribe(name: string): Promise<boolean>;
}
