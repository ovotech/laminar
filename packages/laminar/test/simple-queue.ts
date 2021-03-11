import { EventEmitter } from 'events';
import { Service } from '../src';

export interface SimpleQueueJob<TData> {
  queue: string;
  data: TData;
}

export type SimpleQueueApp<TData> = (data: SimpleQueueJob<TData>) => Promise<void>;

export interface SimpleQueueListener<TData> {
  queue: string;
  app: SimpleQueueApp<TData>;
}

export class Boss<TData> extends EventEmitter implements Service {
  add(queue: string, data: TData): void {
    this.emit(queue, { queue, data });
  }

  describe(): string {
    return 'Boss';
  }

  async stop(): Promise<this> {
    return this;
  }

  async start(): Promise<this> {
    return this;
  }
}

export class SimpleQueue<TData> implements Service {
  constructor(public boss: EventEmitter, public listeners: Array<SimpleQueueListener<TData>> = []) {}

  async start(): Promise<this> {
    for (const listener of this.listeners) {
      this.boss.on(listener.queue, listener.app);
    }
    return this;
  }

  async stop(): Promise<this> {
    for (const listener of this.listeners) {
      this.boss.off(listener.queue, listener.app);
    }
    return this;
  }

  describe(): string {
    return `Queue: ${this.listeners.map((listener) => listener.queue).join(', ')}`;
  }
}
