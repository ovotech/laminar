import { ClientBase } from 'pg';
import { MeterReadRow } from './types';
import sql from 'sql-template-tag';

interface QueryParams {
  date?: Date;
  serialNumber?: string;
}

export const meterReadsSelectQuery = async (db: ClientBase, params: QueryParams): Promise<MeterReadRow[]> => {
  const { rows } = await db.query<MeterReadRow>(sql`
    SELECT
      serial_number as "serialNumber",
      value,
      date
    FROM
      meter_reads
    WHERE
      CASE
        WHEN ${params.date} THEN date = ${params.date}
        WHEN ${params.serialNumber} THEN serial_number = ${params.serialNumber}
        ELSE TRUE
      END
  `);
  return rows;
};
