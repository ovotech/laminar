import { Service } from '../types';
import { Queue, Subscribe } from './types';

export class QueueWorkerService<ReqData> implements Service {
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
    return [
      `🧑‍🏭 Queue Worker: ${this.subscribe.name}`,
      this.subscribe.options ? `Options ${JSON.stringify(this.subscribe.options)}` : undefined,
    ].join(', ');
  }
}
