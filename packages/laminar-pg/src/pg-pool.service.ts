import { Service } from '@ovotech/laminar';
import { Pool, PoolClient } from 'pg';

export class PgPoolService implements Service {
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
