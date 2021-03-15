import { ClientBase } from 'pg';
import { MeterReadRow } from './types';
import sql, { join } from 'sql-template-tag';

export type InsertMeterRead = Omit<MeterReadRow, 'id'>;

export const meterReadsInsertQuery = async (db: ClientBase, items: InsertMeterRead[]): Promise<void> => {
  await db.query(sql`
    INSERT INTO meter_reads(serial_number, value, date)
    VALUES ${join(items.map((item) => sql`(${item.serialNumber}, ${item.value}, ${item.date})`))}
  `);
};
