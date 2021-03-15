import { jsonBadRequest, jsonOk, QueueContext } from '@ovotech/laminar';
import { PathV1HydrationMeterreadsPost } from '../../__generated__/schema';
import { Record, String, Array, Static } from 'runtypes';
import * as parse from 'csv-parse/lib/sync';
import { InsertMeterRead } from '../../queries/meter-reads-insert.query';

const CsvRow = Record({ serialNumber: String, value: String, date: String });

const toMeterRead = ({ serialNumber, value, date }: Static<typeof CsvRow>): InsertMeterRead => ({
  serialNumber,
  value,
  date: new Date(date),
});

export const hydrationMeterReadsRoute: PathV1HydrationMeterreadsPost<QueueContext> = async ({
  queue,
  body,
  headers,
}) => {
  const items = Array(CsvRow).validate(parse(body, { columns: true }));
  if (items.success) {
    await queue.publish({
      name: 'import',
      data: { csv: items.value.map(toMeterRead), traceToken: headers['x-trace-token'] },
    });
    return jsonOk({ success: true });
  } else {
    return jsonBadRequest({ message: items.message, key: items.key });
  }
};
