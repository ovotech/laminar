import {
  Context,
  HttpServer,
  loggerMiddleware,
  requestLoggingMiddleware,
  PgService,
  pgMiddleware,
  QueueService,
  queueMiddleware,
  QueueSubscriptionService,
  LoggerService,
} from '@ovotech/laminar';
import { ConsumerService, toLogCreator } from '@ovotech/laminar-kafka';
import { SchemaRegistry } from '@kafkajs/confluent-schema-registry';
import * as PgBoss from 'pg-boss';
import { Kafka, logLevel } from 'kafkajs';
import { Pool } from 'pg';
import { meterReadsConsumer } from './services/consumers/meter-reads.consumer';
import { EnvVars } from './env';
import { httpApp } from './services/http/http.app';
import { importSubscription } from './services/queue/import.subscription';
import { createLogger, transports } from 'winston';
import { consoleTransportFormat } from './logger';

export const createContext = async (env: EnvVars): Promise<Context> => {
  /**
   * Dependencies
   */
  const winston = createLogger({
    transports: [new transports.Console({ format: consoleTransportFormat })],
    level: env.LOG_LEVEL,
  });
  const kafka = new Kafka({ brokers: [env.KAFKA_BROKER], logCreator: toLogCreator(winston), logLevel: logLevel.ERROR });
  const schemaRegistry = new SchemaRegistry({ host: env.KAFKA_SCHEMA_REGISTRY });
  const pg = new Pool({ connectionString: env.DB_CONNECTION });
  const pgBoss = new PgBoss({ connectionString: env.DB_CONNECTION });

  /**
   * Dependency services
   */
  const pool = new PgService(pg);
  const queue = new QueueService(pgBoss);
  const logger = new LoggerService(winston);
  const dependencyServices = [logger, [pool, queue]];

  /**
   * Middlewares
   */
  const withPool = pgMiddleware(pool);
  const withLogger = loggerMiddleware(logger);
  const withQueue = queueMiddleware(queue);
  const withRequestLogging = requestLoggingMiddleware(logger);

  /**
   * Services
   */
  const services = [
    new QueueSubscriptionService(queue, {
      name: 'import',
      app: withPool(withLogger(importSubscription)),
    }),
    new HttpServer({ app: withQueue(withRequestLogging(withPool(await httpApp(env)))) }),
    new ConsumerService(kafka, schemaRegistry, {
      topic: 'test-1',
      groupId: `${env.KAFKA_GROUP_ID}-test-1`,
      eachMessage: withLogger(withPool(meterReadsConsumer)),
    }),
  ];

  return { services: [dependencyServices, services], logger };
};
