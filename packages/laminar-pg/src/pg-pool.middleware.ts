import { Middleware } from '@ovotech/laminar';
import { PoolClient } from 'pg';
import { PgPoolService } from './pg-pool.service';

export interface RequestPgPool {
  db: PoolClient;
}

/**
 * A middleware that handles DB access.
 * Each request gets its own pool client,
 * so there is isolation between requests and their transactions.
 *
 * We are also able to handle exceptions gracefully,
 * releasing the client from the pool in an event of one.
 */
export const pgPoolMiddleware = (pool: PgPoolService): Middleware<RequestPgPool> => {
  return (next) => async (req) => {
    // Each request gets its own client connection.
    const db = await pool.connect();
    try {
      return await next({ ...req, db });
    } finally {
      // put the client back into the pool even in an event of an exception.
      db.release();
    }
  };
};
