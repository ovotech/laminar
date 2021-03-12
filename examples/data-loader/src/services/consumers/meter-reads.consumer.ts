import { RequestLogging } from '@ovotech/laminar';
import { EachMessageConsumer } from '@ovotech/laminar-kafka';
import { RequestPgPool } from '@ovotech/laminar-pg';
import { MeterReading } from '../../__generated__/meter-reading.json';

export const meterReadsConsumer: EachMessageConsumer<MeterReading, RequestPgPool & RequestLogging> = async ({
  message,
  logger,
}) => {
  logger.info(message.decodedValue);
};
