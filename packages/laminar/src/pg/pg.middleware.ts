import { Middleware } from '../types';
import type { PoolClient } from 'pg';
import { PgService } from './pg.service';

export interface RequestPg {
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
export const pgMiddleware = (pool: PgService): Middleware<RequestPg> => {
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
