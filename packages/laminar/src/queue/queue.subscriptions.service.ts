import { Service } from '../types';
import { Queue, Subscribe } from './types';

export class QueueSubscriptionsService implements Service {
  constructor(public queue: Queue, public subscriptions: Subscribe[]) {}

  async start(): Promise<this> {
    await Promise.all(this.subscriptions.map((item) => this.queue.subscribe(item)));
    return this;
  }

  async stop(): Promise<this> {
    await Promise.all(this.subscriptions.map((item) => this.queue.unsubscribe(item.name)));
    return this;
  }

  describe(): string {
    return `Queue Subscriptions: ${this.subscriptions.map((item) => item.name).join(', ')}`;
  }
}
