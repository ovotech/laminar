import {
  Application,
  HttpService,
  requestLoggingMiddleware,
  pgMiddleware,
  PgService,
  LoggerLike,
} from '@ovotech/laminar';
import { createHttp } from './http';
import { Pool } from 'pg';
import { EnvVars } from './env';
import { petsDbMiddleware } from './middleware';

interface PetStoreApplication extends Application {
  secret: string;
  pg: PgService;
  http: HttpService;
}

export const createApplication = async (env: EnvVars, logger: LoggerLike): Promise<PetStoreApplication> => {
  /**
   * Dependencies
   */
  const pool = new Pool({ connectionString: env.PG });

  /**
   * Internal Services
   */
  const pg = new PgService(pool);

  /**
   * Middlewares
   */
  const withPg = pgMiddleware(pg);
  const withLogger = requestLoggingMiddleware(logger);
  const withPetsDb = petsDbMiddleware();

  /**
   * Services
   */
  const http = new HttpService({
    listener: withLogger(withPg(withPetsDb(await createHttp(env)))),
    port: Number(env.PORT),
    hostname: env.HOST,
  });

  return { services: [pg, http], secret: env.SECRET, pg, http, logger };
};
