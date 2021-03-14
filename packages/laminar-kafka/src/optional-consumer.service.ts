import { SchemaRegistry } from '@kafkajs/confluent-schema-registry';
import { Kafka, ConsumerSubscribeTopic, ConsumerConfig } from 'kafkajs';
import { ConsumerService } from './consumer.service';
import { SchemaRegistryConsumerRunConfig } from './types';

export class OptionalConsumerService<TValue> extends ConsumerService<TValue> {
  public isActive = false;

  constructor(
    kafka: Kafka,
    schemaRegistry: SchemaRegistry,
    config: SchemaRegistryConsumerRunConfig<TValue> & ConsumerConfig & Partial<ConsumerSubscribeTopic>,
  ) {
    super(kafka, schemaRegistry, { topic: '', ...config });
    this.isActive = config.topic !== undefined;
  }

  public async start(): Promise<this> {
    return this.isActive ? super.start() : this;
  }

  public async stop(): Promise<this> {
    return this.isActive ? super.stop() : this;
  }

  public describe(): string {
    return this.isActive
      ? `Optional Consumer ${this.config.topic}, group: ${this.config.groupId}`
      : `Optional Consumer [SKIPPED] group: ${this.config.groupId}`;
  }
}
