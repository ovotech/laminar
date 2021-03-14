import { AppRoute, RequestLogging, jsonOk } from '@ovotech/laminar';
import { RequestPg } from './db.middleware';

/**
 * Updating a user requires a PG connection and logging capablilities
 */
export type UpdateRoute = AppRoute<RequestPg & RequestLogging>;

export const update: UpdateRoute = async ({ path, pg, body, logger }) => {
  await pg.query('UPDATE users SET name = $1 WHERE id = $2', [body.name, path.id]);
  logger.info('User Updated');

  return jsonOk({ message: 'User Updated' });
};
