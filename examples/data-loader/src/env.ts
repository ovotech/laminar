import { Record, String, Undefined, Static, Union, Literal } from 'runtypes';

export const EnvVarsRecord = Record({
  // Database
  DB_CONNECTION: String,

  // Kafka
  KAFKA_BROKER: String,
  KAFKA_SCHEMA_REGISTRY: String,
  KAFKA_GROUP_ID: String,

  // Server
  HOST: String,
  PORT: String,
  SECRET: String,
  LOG_LEVEL: Union(Literal('error'), Literal('warn'), Literal('info'), Literal('debug'), Undefined),
});

export type EnvVars = Static<typeof EnvVarsRecord>;
