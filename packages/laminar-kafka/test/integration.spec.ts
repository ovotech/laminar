import {
  ConsumerService,
  ProducerService,
  DecodedEachBatch,
  DecodedEachMessage,
  chunkBatchMiddleware,
  toLogCreator,
  produce,
  registerSchemas,
} from '../src';
import { retry } from 'ts-retry-promise';
import { LoggerLike, Middleware, start, stop } from '@ovotech/laminar';
import * as uuid from 'uuid';
import { Kafka } from 'kafkajs';
import { SchemaRegistry } from '@kafkajs/confluent-schema-registry';
import { SchemaType } from '@kafkajs/confluent-schema-registry/dist/@types';

export interface LoggerContext {
  logger: LoggerLike;
}

export const loggerMiddleware = (logger: LoggerLike): Middleware<LoggerContext> => (next) => (ctx) =>
  next({ ...ctx, logger });

export interface Event1 {
  field1: string;
}
export interface Event2 {
  field2: string;
}

export const Event1Schema = {
  type: 'record' as const,
  namespace: 'com.example.event',
  name: 'Event',
  fields: [{ name: 'field1', type: 'string' }],
};

export const Event2Schema = {
  type: 'record' as const,
  name: 'Event',
  namespace: 'com.example.event',
  fields: [{ name: 'field2', type: 'string' }],
};

const topic1 = `test-single-${uuid.v4()}`;
const topic2 = `test-batch-${uuid.v4()}`;
const topic3 = `test-sized-batch-${uuid.v4()}`;

const groupId1 = `test-group-1-${uuid.v4()}`;
const groupId2 = `test-group-2-${uuid.v4()}`;
const groupId3 = `test-group-3-${uuid.v4()}`;
const data: { [key: number]: string[] } = { 0: [], 1: [], 2: [] };

const sendEvent3 = produce<Event2>({
  topic: topic3,
  schema: { type: SchemaType.AVRO, schema: JSON.stringify(Event2Schema) },
});

const eachEvent1: DecodedEachMessage<Event1, LoggerContext> = async ({ message, partition, logger }) => {
  if (message.decodedValue) {
    data[partition].push(message.decodedValue.field1);
    logger.info(message.decodedValue.field1);
  }
};

const eachEvent2: DecodedEachBatch<Event2, LoggerContext> = async ({ batch, logger }) => {
  for (const msg of batch.messages) {
    if (msg.decodedValue) {
      data[batch.partition].push(msg.decodedValue.field2);
      logger.info(msg.decodedValue.field2);
    }
  }
};

const myLogger = {
  info: jest.fn(),
  debug: jest.fn(),
  error: jest.fn(),
  log: jest.fn(),
  warn: jest.fn(),
};
const logging = loggerMiddleware(myLogger);
const logCreator = toLogCreator(myLogger);

const batchSizer = jest.fn();

describe('Integration', () => {
  it('Should process response', async () => {
    jest.setTimeout(30000);
    const kafka = new Kafka({ brokers: ['localhost:29092'], logCreator });
    const schemaRegistry = new SchemaRegistry({ host: 'http://localhost:8081' });
    const admin = kafka.admin();

    const event1Service = new ConsumerService<Event1>(kafka, schemaRegistry, {
      topic: topic1,
      groupId: groupId1,
      eachMessage: logging(eachEvent1),
    });

    const event2Service = new ConsumerService<Event2>(kafka, schemaRegistry, {
      topic: topic2,
      groupId: groupId2,
      eachBatch: logging(eachEvent2),
    });

    const event3Service = new ConsumerService<Event2>(kafka, schemaRegistry, {
      topic: topic3,
      fromBeginning: true,
      groupId: groupId3,
      autoCommitInterval: 20000,
      autoCommitThreshold: 2,
      eachBatch: chunkBatchMiddleware({ size: 2 })(
        async ({ batch: { messages, partition, firstOffset, lastOffset } }) => {
          const commitedOffset = await admin.fetchOffsets({ groupId: groupId3, topic: topic3 });

          batchSizer({
            partition,
            firstOffset: firstOffset(),
            lastOffset: lastOffset(),
            commitedOffset: commitedOffset.map(({ offset, partition }) => ({
              offset: +offset,
              partition,
            })),
            messages: messages.map(({ decodedValue }) => decodedValue?.field2),
          });
        },
      ),
    });

    const producer = new ProducerService(kafka, schemaRegistry, {
      register: registerSchemas({
        [topic1]: { type: SchemaType.AVRO, schema: JSON.stringify(Event1Schema) },
        [topic2]: { type: SchemaType.AVRO, schema: JSON.stringify(Event2Schema) },
      }),
    });

    const services = [producer, [event1Service, event2Service, event3Service]];

    try {
      await admin.connect();
      await admin.createTopics({
        topics: [
          { topic: topic1, numPartitions: 3 },
          { topic: topic2, numPartitions: 2 },
          { topic: topic3, numPartitions: 1 },
        ],
      });
      await start(services, myLogger);

      await Promise.all([
        producer.send<Event1>({ topic: topic1, messages: [{ value: { field1: 'test1' }, partition: 0 }] }),
        producer.send<Event1>({
          topic: topic1,
          messages: [
            { value: { field1: 'test2' }, partition: 1 },
            { value: { field1: 'test3' }, partition: 2 },
            { value: { field1: 'test4' }, partition: 0 },
          ],
        }),
        producer.send<Event2>({
          topic: topic2,
          messages: [
            { value: { field2: 'test5' }, partition: 1 },
            { value: { field2: 'test6' }, partition: 1 },
            { value: { field2: 'test7' }, partition: 0 },
          ],
        }),
        sendEvent3(producer, [
          { value: { field2: 'p0m1' }, partition: 0 },
          { value: { field2: 'p0m2' }, partition: 0 },
          { value: { field2: 'p0m3' }, partition: 0 },
          { value: { field2: 'p0m4' }, partition: 0 },
          { value: { field2: 'p0m5' }, partition: 0 },
        ]),
      ]);

      await retry(
        async () => {
          expect(data).toEqual({
            0: expect.arrayContaining(['test1', 'test4', 'test7']),
            1: expect.arrayContaining(['test2', 'test5', 'test6']),
            2: ['test3'],
          });

          expect(myLogger.info).toHaveBeenCalledWith('test1');
          expect(myLogger.info).toHaveBeenCalledWith('test2');
          expect(myLogger.info).toHaveBeenCalledWith('test3');
          expect(myLogger.info).toHaveBeenCalledWith('test4');
          expect(myLogger.info).toHaveBeenCalledWith('test5');
          expect(myLogger.info).toHaveBeenCalledWith('test6');
          expect(myLogger.info).toHaveBeenCalledWith('test7');

          expect(batchSizer).toHaveBeenCalledWith({
            partition: 0,
            messages: ['p0m1', 'p0m2'],
            firstOffset: '0',
            lastOffset: '1',
            commitedOffset: expect.arrayContaining([{ partition: 0, offset: -1 }]),
          });
          expect(batchSizer).toHaveBeenCalledWith({
            partition: 0,
            messages: ['p0m3', 'p0m4'],
            firstOffset: '2',
            lastOffset: '3',
            commitedOffset: expect.arrayContaining([{ partition: 0, offset: 2 }]),
          });
          expect(batchSizer).toHaveBeenCalledWith({
            partition: 0,
            messages: ['p0m5'],
            firstOffset: '4',
            lastOffset: '4',
            commitedOffset: expect.arrayContaining([{ partition: 0, offset: 4 }]),
          });
        },
        { delay: 1000, retries: 20 },
      );
    } finally {
      await admin.disconnect();
      await stop(services, myLogger);
    }
  });
});
