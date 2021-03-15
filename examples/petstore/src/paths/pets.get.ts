import { PathPetsGet } from '../__generated__/petstore';
import { jsonOk } from '@ovotech/laminar';
import { PetsDbContext } from '../middleware';

/**
 * Request and response are both validated runtime and checked at compoile time
 * That's why we need to use `jsonOk` to set the correct Content-Type header and status.
 *
 * Laminar provides helpers for common status codes and content types, but its easy to roll your own
 *
 * Anithing that's deviating from the OpenAPI schema - the shape of the json response, status or content-type
 * would be flagged by typescript as an error
 */
export const pathPetsGet: PathPetsGet<PetsDbContext> = async ({ petsDb, query }) => {
  const { tags, limit } = query;
  return jsonOk(await petsDb.all({ tags, limit }));
};
