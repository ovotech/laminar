import { init } from '@ovotech/laminar';
import { EnvVarsRecord } from './env';
import { createApplication } from './application';
import { config } from 'dotenv';

/**
 * Load env variables from the .env file
 */
config();

createApplication(EnvVarsRecord.check(process.env)).then(init);
