import { RequestLogging, RequestPg, JobHandler } from '@ovotech/laminar';

export interface ImportItem {
  serialNumber: string;
  date: Date;
  value: number;
}

export type ImportJob = ImportItem[];

export const importSubscription: JobHandler<ImportJob, RequestLogging & RequestPg> = async ({ data, logger }) => {
  logger.info('Import', { data });
};
