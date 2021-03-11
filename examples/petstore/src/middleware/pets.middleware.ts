import { Middleware } from '@ovotech/laminar';
import { PoolClient } from 'pg';
import { NewPet, Pet } from '../__generated__/petstore';
import { RequestPgPool } from '@ovotech/laminar-pg';

/**
 * A simple repository for handling pets
 * Encapsulates all the database queries, so that we can use a higher level abstraction in our controllers.
 */
export class PetsDb {
  public constructor(private db: PoolClient) {}

  public async all({ tags, limit = '20' }: { tags?: string[]; limit?: string }): Promise<Pet[]> {
    const query = tags
      ? {
          text: 'SELECT id, name, tag FROM pets WHERE tag = ANY($1::text[]) LIMIT $2',
          values: [tags, limit],
        }
      : { text: 'SELECT id, name, tag FROM pets LIMIT $1', values: [limit] };

    return (await this.db.query<Pet>(query)).rows;
  }

  public async find(id: string): Promise<Pet | undefined> {
    return (await this.db.query<Pet>('SELECT id, name, tag FROM pets WHERE id = $1', [id])).rows[0];
  }

  public async add({ name, tag }: NewPet): Promise<Pet> {
    const insertQuery = {
      text: `
        INSERT INTO pets (name, tag)
        VALUES ($1, $2)
        RETURNING id, name, tag`,
      values: [name, tag],
    };

    return (await this.db.query<Pet>(insertQuery)).rows[0];
  }

  public async remove(id: string): Promise<number> {
    return (await this.db.query('DELETE FROM pets WHERE id = $1', [id])).rowCount;
  }
}

export interface RequestPetsDb {
  petsDb: PetsDb;
}

/**
 * Since it relies on the pool client, we will create a new object for each request.
 * While not as optimal as shareing it between requests,
 * it would mean we are absolutly sure about its isolation between requests.
 *
 * We explicitly require the request to have the "RequestPgPool" type
 * This ensures we apply it after the pgPoolMiddleware.
 *
 * It will provide all subsiquent middlewares with the petsDb object.
 */
export const petsDbMiddleware = (): Middleware<RequestPetsDb, RequestPgPool> => {
  return (next) => (req) => {
    const petsDb = new PetsDb(req.db);
    return next({ ...req, petsDb });
  };
};
