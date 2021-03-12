import { SchemaRegistry } from '@kafkajs/confluent-schema-registry';
import { ContextItem, HttpServer, init, LoggerLike, loggingMiddleware } from '@ovotech/laminar';
import { ConsumerService } from '@ovotech/laminar-kafka';
import { PgPoolService, pgPoolMiddleware } from '@ovotech/laminar-pg';
import { Kafka } from 'kafkajs';
import { Pool } from 'pg';
import { meterReadsConsumer } from './services/consumers/meter-reads.consumer';
import { EnvVars } from './env';
import { httpApp } from './services/http/http.app';
import { MeterReading } from './__generated__/meter-reading.json';
import { WinstonService } from './services/winston.service';

export const services = async (env: EnvVars): Promise<{ services: ContextItem[]; logger: LoggerLike }> => {
  /**
   * Dependencies
   */
  const kafka = new Kafka({ brokers: ['localhost:9092'] });
  const schemaRegistry = new SchemaRegistry({ host: 'http://localhost:8081' });
  const pg = new Pool({ connectionString: env.DB_CONNECTION });

  /**
   * Internal services
   */
  const logger = new WinstonService(env);
  const pool = new PgPoolService(pg);

  /**
   * Middlewares
   */
  const withPool = pgPoolMiddleware(pool);
  const withLogging = loggingMiddleware(logger);

  /**
   * External Request Services
   */
  const httpServer = new HttpServer({ app: withLogging(withPool(await httpApp(env))) });
  const meterReadingService = new ConsumerService<MeterReading>(kafka, schemaRegistry, {
    topic: 'test-1',
    groupId: 'test-1',
    eachMessage: withLogging(withPool(meterReadsConsumer)),
  });

  return { services: [logger, pool, [httpServer, meterReadingService]], logger };
};
