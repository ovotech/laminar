import { HttpService, init, jsonOk, jsonForbidden, securityOk } from '@ovotech/laminar';
import { join } from 'path';
import { openApiTyped } from './__generated__/api';

const findUser = (id: string) => ({ id, name: 'John' });

/**
 * A simple validate function that would return either SecurityOk or Response objects.
 * All security resolvers must do that.
 * If you return `securityOk` that means the user is validated
 * and the contents of `securityOk` would be passed to the `authInfo` property of the object
 *
 * Otherwise the Response would be returned directly
 */
const validate = (authorizaitonHeader?: string) =>
  authorizaitonHeader === 'Secret Pass'
    ? securityOk({ email: 'me@example.com' })
    : jsonForbidden({ message: 'Unkown user' });

const main = async () => {
  const listener = await openApiTyped({
    api: join(__dirname, 'api.yaml'),
    security: {
      /**
       * Implementing the security
       */
      JWT: ({ headers }) => validate(headers.authorization),
    },
    paths: {
      '/user/{id}': {
        get: async ({ path }) => jsonOk(findUser(path.id)),
      },
    },
  });
  const http = new HttpService({ listener });
  await init({ services: [http], logger: console });
};

main();
