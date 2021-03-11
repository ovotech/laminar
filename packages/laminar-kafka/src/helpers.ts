import { ConfluentSchema } from '@kafkajs/confluent-schema-registry/dist/@types';
import { LoggerLike } from '@ovotech/laminar';
import { logLevel, logCreator, RecordMetadata } from 'kafkajs';
import { ProducerService } from './producer.service';
import { EncodedMessage } from './types';

const stringLevel: {
  [key in logLevel]: 'error' | 'warn' | 'info' | 'debug';
} = {
  [logLevel.NOTHING]: 'error',
  [logLevel.ERROR]: 'error',
  [logLevel.WARN]: 'warn',
  [logLevel.INFO]: 'info',
  [logLevel.DEBUG]: 'debug',
};

export const toLogCreator = (logger: LoggerLike): logCreator => () => ({ level, log: { message, ...extra } }) => {
  logger[stringLevel[level]](message, extra);
};

export type Produce<TValue> = (
  producer: ProducerService,
  messages: EncodedMessage<TValue>[],
) => Promise<RecordMetadata[]>;

export const produce = <TValue>(config: { topic: string; schema: ConfluentSchema }): Produce<TValue> => (
  producer,
  messages,
) => producer.sendWithSchema<TValue>({ ...config, messages });
