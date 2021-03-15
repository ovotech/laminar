import { Service } from '../';
import { LoggerLike, LoggerMetadata } from './types';
import type { Logger } from 'winston';

export class LoggerService implements Service, LoggerLike {
  constructor(public source: Logger) {}

  debug(message: any, metadata?: LoggerMetadata): void {
    this.source.log({ level: 'debug', message, metadata });
  }

  info(message: any, metadata?: LoggerMetadata): void {
    this.source.log({ level: 'info', message, metadata });
  }

  warn(message: any, metadata?: LoggerMetadata): void {
    this.source.log({ level: 'warn', message, metadata });
  }

  error(message: any, metadata?: LoggerMetadata): void {
    this.source.log({ level: 'error', message, metadata });
  }

  async start(): Promise<this> {
    return this;
  }

  async stop(): Promise<this> {
    await new Promise((resolve) => this.source.end(resolve));
    return this;
  }

  describe(): string {
    return '📜 Winston Logger';
  }
}
