import {
  Application,
  HttpService,
  loggerMiddleware,
  requestLoggingMiddleware,
  jobLoggingMiddleware,
  PgService,
  pgMiddleware,
  QueueService,
  queueMiddleware,
  QueueWorkerService,
  LoggerService,
  KafkaConsumerService,
  kafkaLogCreator,
} from '@ovotech/laminar';
import { SchemaRegistry } from '@kafkajs/confluent-schema-registry';
import * as PgBoss from 'pg-boss';
import { Kafka, logLevel } from 'kafkajs';
import { Pool } from 'pg';
import { meterReadsConsumer } from './services/consumers/meter-reads.consumer';
import { EnvVars } from './env';
import { httpListener } from './services/http/http.listener';
import { importWorker } from './services/queue/import.worker';
import { createLogger, transports } from 'winston';
import { consoleTransportFormat } from './logger';

/**
 * The main function of our project
 * Will create all the services it consists of and return them so we can start each one as needed.
 * Only depend on the environment variables, so we can test to as close to prod setting as possible, while not spawining any processes.
 *
 * @param env The validated object of environment variables, should come from process.env
 */
export const createApplication = async (env: EnvVars): Promise<Application> => {
  /**
   * Dependencies
   * ------------------------------------------------------------------------------
   * We create all the clients and external interfaces that our services depend on.
   * Everything here is only external dependencies.
   * If this grows too big we can move this to its own function.
   */

  const winston = createLogger({
    transports: [new transports.Console({ format: consoleTransportFormat })],
    level: env.LOG_LEVEL,
  });
  const kafka = new Kafka({
    brokers: [env.KAFKA_BROKER],
    logCreator: kafkaLogCreator(winston),
    logLevel: logLevel.ERROR,
  });
  const schemaRegistry = new SchemaRegistry({ host: env.KAFKA_SCHEMA_REGISTRY });
  const pool = new Pool({ connectionString: env.DB_CONNECTION });
  const pgBoss = new PgBoss({ connectionString: env.DB_CONNECTION });

  /**
   * Internal services
   * ------------------------------------------------------------------------------
   *
   * Here we convert the external dependencies into {@link Service} objects, so we can maintain them properly
   * {@link Service} implements start(), stop() and describe() methods, which are used to mainain their lifecycles
   */

  const pg = new PgService(pool);
  const queue = new QueueService(pgBoss);
  const logger = new LoggerService(winston);

  /**
   * Combine all the internal services. Arrays of services will be started in parallel.
   */
  const internalServices = [logger, [pg, queue]];

  /**
   * Middlewares
   * ------------------------------------------------------------------------------
   *
   * Use the internal services to create all the middlewares we'll need for our external services.
   *
   * Those allow us to run some code, based on those internal services, on each request / consumption / worker run.
   *
   * For example the {@link pgMiddleware} will use the {@link PgService} to get a connection from the pool and use it.
   * That way every request will have its own connection, so there's no chance of transactions from one request affecting another.
   */

  const withPg = pgMiddleware(pg);
  const withLogger = loggerMiddleware(logger);
  const withJobLogging = jobLoggingMiddleware(logger);
  const withQueue = queueMiddleware(queue);
  const withRequestLogging = requestLoggingMiddleware(logger);

  /**
   * Services
   * ------------------------------------------------------------------------------
   *
   * Here we create our Services that will do the actual business logic.
   * Since its an array, all of them will be started in parallel.
   */
  const services = [
    new QueueWorkerService(queue, {
      name: 'import',
      worker: withPg(withJobLogging(importWorker)),
    }),
    new KafkaConsumerService(kafka, schemaRegistry, {
      topic: 'test-1',
      groupId: `${env.KAFKA_GROUP_ID}-test-1`,
      eachMessage: withLogger(withPg(meterReadsConsumer)),
    }),
    new HttpService({ listener: withQueue(withRequestLogging(withPg(await httpListener(env)))) }),
  ];

  return { services: [internalServices, services], logger };
};
