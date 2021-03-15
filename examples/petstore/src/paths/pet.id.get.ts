import { PathPetsIdGet } from '../__generated__/petstore';
import { jsonNotFound, jsonOk, optional } from '@ovotech/laminar';
import { PetsDb, PetsDbContext } from '../middleware';

/**
 * Request and response are both validated runtime and checked at compoile time
 * That's why we need to use `jsonOk` and `jsonNotFound` to set the correct Content-Type header and status.
 *
 * Laminar provides helpers for common status codes and content types, but its easy to roll your own
 *
 * Anithing that's deviating from the OpenAPI schema - the shape of the json response, status or content-type
 * would be flagged by typescript as an error
 */
export const pathPetsIdGet: PathPetsIdGet<PetsDbContext> = async ({ petsDb, path: { id } }) =>
  optional(jsonOk, await petsDb.find(id)) ?? jsonNotFound({ code: 11, message: `Pet ${id} not found` });
