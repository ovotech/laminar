import { AppRoute, jsonOk, jsonNotFound, optional, PgContext } from '@ovotech/laminar';

/**
 * Finding a user requires a PG connection
 */
export type FindRoute = AppRoute<PgContext>;

export const find: FindRoute = async ({ path, db }) => {
  const sql = 'SELECT id, name, created_at as "createdAt" FROM users WHERE id = $1';
  const { rows } = await db.query(sql, [path.id]);

  return optional(jsonOk, rows[0]) ?? jsonNotFound({ message: `No User With id ${path.id} was found` });
};
