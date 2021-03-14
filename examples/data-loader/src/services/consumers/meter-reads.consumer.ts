import { RequestLogging, RequestPg } from '@ovotech/laminar';
import { EachMessageConsumer } from '@ovotech/laminar-kafka';
import { MeterReading } from '../../__generated__/meter-reading.json';

export const meterReadsConsumer: EachMessageConsumer<MeterReading, RequestPg & RequestLogging> = async ({
  message,
  logger,
}) => {
  logger.info(message.decodedValue);
};
