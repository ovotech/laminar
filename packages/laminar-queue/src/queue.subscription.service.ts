import { Service } from '@ovotech/laminar';
import { Queue, Subscribe } from './types';

export class QueueSubscriptionService<ReqData> implements Service {
  constructor(public queue: Queue, public subscribe: Subscribe<ReqData>) {}

  async start(): Promise<this> {
    await this.queue.subscribe(this.subscribe);
    return this;
  }

  async stop(): Promise<this> {
    await this.queue.unsubscribe(this.subscribe.name);
    return this;
  }

  describe(): string {
    return `Subscription: ${this.subscribe.name}, Options ${JSON.stringify(this.subscribe.options)}`;
  }
}
