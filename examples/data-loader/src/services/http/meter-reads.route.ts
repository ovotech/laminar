import { jsonOk, PgContext } from '@ovotech/laminar';
import { PathV1MeterreadsGet } from '../../__generated__/schema';
import { meterReadsSelectQuery } from '../../queries/meter-reads-select.query';

export const meterReadsRoute: PathV1MeterreadsGet<PgContext> = async ({ db }) => {
  const items = await meterReadsSelectQuery(db, {});
  return jsonOk(items);
};
