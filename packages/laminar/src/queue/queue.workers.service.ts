import { Service } from '../types';
import { Queue, Subscribe } from './types';

export class QueueWorkersService implements Service {
  constructor(public queue: Queue, public workers: Subscribe[]) {}

  async start(): Promise<this> {
    await Promise.all(this.workers.map((item) => this.queue.subscribe(item)));
    return this;
  }

  async stop(): Promise<this> {
    await Promise.all(this.workers.map((item) => this.queue.unsubscribe(item.name)));
    return this;
  }

  describe(): string {
    return `🧑‍🏭🧑‍🏭 Queue Workers: ${this.workers.map((item) => item.name).join(', ')}`;
  }
}
