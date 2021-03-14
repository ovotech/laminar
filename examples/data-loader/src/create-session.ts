import { EnvVarsRecord } from './env';
import { createSession } from '@ovotech/laminar-jwt';
import { config } from 'dotenv';

/**
 * Create a jwt token for debugging / dev
 */
config();

const env = EnvVarsRecord.check(process.env);
const user = { email: 'dev@example.com', scopes: ['read', 'update'] };
const session = createSession({ secret: env.SECRET }, user);

console.log(session.jwt);
