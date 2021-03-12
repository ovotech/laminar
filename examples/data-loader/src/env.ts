import { Record, String, Undefined, Static } from 'runtypes';

export const EnvVarsRecord = Record({
  // Database
  DB_CONNECTION: String,

  // Kafka
  KAFKA_BROKER: String,
  KAFKA_SCHEMA_REGISTRY: String,
  KAFKA_GROUP_ID: String,

  // Server
  HOST: String.Or(Undefined),
  PORT: String.Or(Undefined),
  SECRET: String,
  LOG_LEVEL: String.Or(Undefined),
});

export type EnvVars = Static<typeof EnvVarsRecord>;
