import type { SchemaRegistry } from '@kafkajs/confluent-schema-registry';
import type {
  KafkaMessage,
  EachMessagePayload,
  Batch,
  EachBatchPayload,
  ConsumerRunConfig,
  Message,
  ProducerRecord,
} from 'kafkajs';
import { Empty } from '../types';

export interface DecodedKafkaMessage<TValue> extends KafkaMessage {
  decodedValue: TValue | null;
}

export interface DecodedEachMessagePayload<TValue> extends EachMessagePayload {
  schemaRegistry: SchemaRegistry;
  message: DecodedKafkaMessage<TValue>;
}

export interface DecodedBatch<TValue> extends Batch {
  messages: DecodedKafkaMessage<TValue>[];
}

export interface DecodedEachBatchPayload<TValue> extends EachBatchPayload {
  schemaRegistry: SchemaRegistry;
  batch: DecodedBatch<TValue>;
}

export type EachMessageConsumer<TValue, TContext extends Empty = Empty> = (
  payload: DecodedEachMessagePayload<TValue> & TContext,
) => Promise<void>;

export type EachBatchConsumer<TValue, TContext extends Empty = Empty> = (
  payload: DecodedEachBatchPayload<TValue> & TContext,
) => Promise<void>;

export interface SchemaRegistryConsumerRunConfig<TValue> extends Omit<ConsumerRunConfig, 'eachMessage' | 'eachBatch'> {
  eachMessage?: EachMessageConsumer<TValue>;
  eachBatch?: EachBatchConsumer<TValue>;
}

export interface EncodedMessage<TValue> extends Omit<Message, 'value'> {
  value: TValue;
}

export interface EncodedProducerRecord<TValue> extends Omit<ProducerRecord, 'messages'> {
  messages: EncodedMessage<TValue>[];
}
