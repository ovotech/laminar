import { LoggerLike, Service, LoggerMetadata } from '@ovotech/laminar';
import { createLogger, Logger, transports } from 'winston';
import { EnvVars } from '../env';

export class WinstonService implements Service, LoggerLike {
  public source: Logger;

  constructor(env: EnvVars) {
    this.source = createLogger({ transports: [new transports.Console()], level: env.LOG_LEVEL });
  }

  debug(message: any, metadata?: LoggerMetadata): void {
    this.source.debug(message, metadata);
  }

  info(message: any, metadata?: LoggerMetadata): void {
    this.source.info(message, metadata);
  }

  warn(message: any, metadata?: LoggerMetadata): void {
    this.source.warn(message, metadata);
  }

  error(message: any, metadata?: LoggerMetadata): void {
    this.source.error(message, metadata);
  }

  async start(): Promise<this> {
    return this;
  }

  async stop(): Promise<this> {
    await new Promise((resolve) => this.source.end(resolve));
    return this;
  }

  describe(): string {
    return 'Winston Logger';
  }
}
