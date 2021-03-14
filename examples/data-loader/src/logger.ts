import { inspect } from 'util';
import { format } from 'winston';

export const consoleTransportFormat = format.combine(
  format.colorize(),
  format.printf(({ level, message, metadata }) => {
    const details = metadata && Object.keys(metadata).length ? inspect(metadata, { colors: true, depth: 10 }) : '';
    return `${level}: ${message} ${details}`;
  }),
);
