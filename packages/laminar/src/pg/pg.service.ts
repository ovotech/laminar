import { Service } from '../types';
import type { Pool, PoolClient } from 'pg';

export class PgService implements Service {
  constructor(public pool: Pool) {}

  connect(): Promise<PoolClient> {
    return this.pool.connect();
  }

  async start(): Promise<this> {
    return this;
  }

  async stop(): Promise<this> {
    await this.pool.end();
    return this;
  }

  describe(): string {
    return '🛢️ Postgres';
  }
}
