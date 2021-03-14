import { Service } from '../types';
import type { Pool, PoolClient } from 'pg';

export class PgService implements Service {
  constructor(public pg: Pool) {}

  connect(): Promise<PoolClient> {
    return this.pg.connect();
  }

  async start(): Promise<this> {
    return this;
  }

  async stop(): Promise<this> {
    await this.pg.end();
    return this;
  }

  describe(): string {
    return 'PG';
  }
}
