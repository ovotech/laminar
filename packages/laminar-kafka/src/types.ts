import { SchemaRegistry } from '@kafkajs/confluent-schema-registry';
import { Empty } from '@ovotech/laminar';
import {
  KafkaMessage,
  EachMessagePayload,
  Batch,
  EachBatchPayload,
  ConsumerRunConfig,
  Message,
  ProducerRecord,
} from 'kafkajs';

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

export type DecodedEachMessage<TValue, TContext extends Empty = Empty> = (
  payload: DecodedEachMessagePayload<TValue> & TContext,
) => Promise<void>;

export type DecodedEachBatch<TValue, TContext extends Empty = Empty> = (
  payload: DecodedEachBatchPayload<TValue> & TContext,
) => Promise<void>;

export interface SchemaRegistryConsumerRunConfig<TValue> extends Omit<ConsumerRunConfig, 'eachMessage' | 'eachBatch'> {
  eachMessage?: DecodedEachMessage<TValue>;
  eachBatch?: DecodedEachBatch<TValue>;
}

export interface EncodedMessage<TValue> extends Omit<Message, 'value'> {
  value: TValue;
}

export interface EncodedProducerRecord<TValue> extends Omit<ProducerRecord, 'messages'> {
  messages: EncodedMessage<TValue>[];
}
