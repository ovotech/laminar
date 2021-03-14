import { init } from '@ovotech/laminar';
import { EnvVarsRecord } from './env';
import { createContext } from './context';
import { config } from 'dotenv';

/**
 * Load env variables from the .env file
 */
config();

createContext(EnvVarsRecord.check(process.env)).then(init);
