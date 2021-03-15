import { init } from '@ovotech/laminar';
import { createSession } from '@ovotech/laminar-jwt';
import { createApplication } from './application';
import { toEnvVars } from './env';

createApplication(toEnvVars(process.env), console)
  .then(init)
  .then(({ secret, http, logger }) => {
    /**
     * We generate a short lived token to be able to login and interact with the service
     * This is just for demonstration and shouldn't be used in production
     */
    const session = createSession({ secret, options: { expiresIn: '1 day' } }, { email: 'me@example.com' });
    logger?.info(`Access with curl:\n\n  curl -H 'Authorization: Bearer ${session.jwt}' ${http.url()}/pets\n`);
  })
  .catch((error) => console.error(error));
