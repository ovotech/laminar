import { PathPetsIdDelete } from '../__generated__/petstore';
import { jsonNotFound, jsonNoContent } from '@ovotech/laminar';
import { PetsDbContext } from '../middleware';

/**
 * Request and response are both validated runtime and checked at compoile time
 * That's why we need to use `jsonNoContent` and `jsonNotFound` to set the correct Content-Type header and status.
 *
 * Laminar provides helpers for common status codes and content types, but its easy to roll your own
 *
 * Anithing that's deviating from the OpenAPI schema - the shape of the json response, status or content-type
 * would be flagged by typescript as an error
 */
export const pathPetsIdDelete: PathPetsIdDelete<PetsDbContext> = async ({ petsDb, path: { id } }) => {
  const pet = await petsDb.find(id);
  if (pet) {
    await petsDb.remove(id);
    return jsonNoContent();
  } else {
    return jsonNotFound({ code: 12, message: `Cannot delete pet ${id} - pet not found` });
  }
};
