import type { SchemaRegistry } from '@kafkajs/confluent-schema-registry';
import type { ConfluentSchema } from '@kafkajs/confluent-schema-registry/dist/@types';
import type { Kafka, Producer, ProducerConfig, RecordMetadata, ProducerRecord } from 'kafkajs';
import { Middleware, Service } from '../types';
import { EncodedProducerRecord } from './types';

export type RegisterSchemas = (schemaRegistry: SchemaRegistry) => Promise<Map<string, number>>;

export interface RegisterSchemasConfig {
  register: RegisterSchemas;
}

export interface ProducerContext {
  producer: KafkaProducerService;
}

export const producerMiddleware = (producer: KafkaProducerService): Middleware<ProducerContext> => (next) => (
  payload,
) => next({ ...payload, producer });

export const toProducerRecord = async <TValue>(
  id: number,
  schemaRegistry: SchemaRegistry,
  { messages, ...rest }: EncodedProducerRecord<TValue>,
): Promise<ProducerRecord> => ({
  ...rest,
  messages: await Promise.all(
    messages.map(async (message) => ({ ...message, value: await schemaRegistry.encode(id, message.value) })),
  ),
});

export const registerSchemas = (register: { [key: string]: ConfluentSchema }): RegisterSchemas => {
  return async (schemaRegistry) =>
    new Map(
      await Promise.all(
        Object.entries(register).map<Promise<[string, number]>>(async ([topic, schema]) => {
          const subject = `${topic}-value`;
          const { id } = await schemaRegistry.register(schema, { subject });
          return [subject, id];
        }),
      ),
    );
};

export class KafkaProducerService implements Service {
  public producer: Producer;
  public register: Map<string, number> = new Map();

  constructor(
    public kafka: Kafka,
    public schemaRegistry: SchemaRegistry,
    public config: ProducerConfig & RegisterSchemasConfig,
  ) {
    this.producer = kafka.producer(config);
  }

  public async send<TValue>(record: EncodedProducerRecord<TValue>): Promise<RecordMetadata[]> {
    const subject = `${record.topic}-value`;
    const id = this.register.get(subject);
    if (!id) {
      throw new Error(
        `Cannot produce message, no schema registered for subject ${subject}. You need to add it to the topics config of the ProducerService`,
      );
    }

    return await this.producer.send(await toProducerRecord(id, this.schemaRegistry, record));
  }

  public async sendWithSchema<TValue>(
    record: EncodedProducerRecord<TValue> & { schema: ConfluentSchema },
  ): Promise<RecordMetadata[]> {
    const { id } = await this.schemaRegistry.register(record.schema, { subject: `${record.topic}-value` });
    return await this.producer.send(await toProducerRecord(id, this.schemaRegistry, record));
  }

  public async sendBuffer(record: ProducerRecord): Promise<RecordMetadata[]> {
    return await this.producer.send(record);
  }

  public async start(): Promise<this> {
    await this.producer.connect();
    this.register = await this.config.register(this.schemaRegistry);
    return this;
  }

  public async stop(): Promise<this> {
    await this.producer.disconnect();
    return this;
  }

  public describe(): string {
    const topics = [...this.register.entries()].map(([topic, id]) => `${topic} (${id})`).join(', ');
    return `📤 Kafka Producer: ${topics}`;
  }
}
