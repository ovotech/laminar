import {
  HttpService,
  htmlOk,
  jsonOk,
  ok,
  csv,
  yaml,
  pdf,
  jsonNotFound,
  jsonUnauthorized,
  securityOk,
  loggerMiddleware,
  run,
  LoggerContext,
} from '@ovotech/laminar';
import axios from 'axios';
import { join } from 'path';
import { openApiTyped } from './__generated__/statements';
import { createReadStream } from 'fs';
import { StatementService, ReportsService } from './statements';

interface AuthInfo {
  email: string;
}

const statementsService = new StatementService();
const reportsService = new ReportsService();

describe('Statements', () => {
  it('Should process response', async () => {
    const oapi = await openApiTyped<LoggerContext, AuthInfo>({
      api: join(__dirname, 'statements.yaml'),
      security: {
        BearerAuth: ({ headers }) => {
          if (headers.authorization !== 'Bearer Me') {
            return jsonUnauthorized({ message: 'Unauthorized' });
          }
          return securityOk({ email: 'me@example.com' });
        },
      },
      paths: {
        '/.well-known/health-check': { get: async () => jsonOk({ success: true }) },
        '/.well-known/openapi.html': {
          get: async () => htmlOk(createReadStream(join(__dirname, 'statements.html'))),
        },
        '/.well-known/openapi.yaml': {
          get: async () => yaml(ok({ body: createReadStream(join(__dirname, 'statements.yaml')) })),
        },
        '/v2/reports/daily': {
          post: async () => {
            reportsService.set('errors', 'daily', 'daily');
            return jsonOk({ success: true });
          },
        },
        '/v2/reports/{type}': {
          get: async ({ path: { type } }) => {
            const items = reportsService.getAll(type);
            return jsonOk({
              total: items.length,
              items: items.map((item) => ({ filename: item.filename, createdAt: item.createdAt })),
            });
          },
          post: async ({ path: { type }, body }) => {
            reportsService.set(type, 'date' in body ? body.date : `${body.fromDate}-${body.toDate}`, 'report');
            return jsonOk({ success: true });
          },
        },
        '/v2/reports/{type}/{filename}': {
          get: async ({ path: { type, filename } }) => {
            const report = reportsService.get(type, filename);
            return report ? csv(ok({ body: report.content })) : jsonNotFound({ message: 'Report not found' });
          },
        },
        '/v2/statements': {
          get: async () =>
            jsonOk(
              statementsService.getAll().map((item) => ({
                id: item.id,
                ref: item.ref,
                accountId: item.account.id,
                createdAt: '2020-01-01',
                isModified: false,
                errors: item.errors ?? [],
                state: item.state,
              })),
            ),
          post: async ({ body }) => {
            const statement = {
              id: body.accountId,
              ref: 'REF111',
              state: 'CREATED' as const,
              account: { id: body.accountId, transactions: [] },
              supplies: [],
            };
            statementsService.add(statement);
            return jsonOk({
              id: body.accountId,
              ref: body.accountId,
              accountId: body.accountId,
              createdAt: '2020-01-01',
              isModified: false,
              errors: [],
              state: 'CREATED' as const,
            });
          },
        },
        '/v2/statements/{id}/approval': {
          post: async ({ path: { id } }) => {
            const result = statementsService.approve(id);
            return result ? jsonOk({ success: true }) : jsonNotFound({ message: 'Cannot approve: Not Found' });
          },
        },
        '/v2/statements/{id}/data': {
          get: async ({ path: { id } }) => {
            const item = statementsService.get(id);
            return item ? jsonOk(item) : jsonNotFound({ message: 'NoData: Statement not found' });
          },
        },
        '/v2/statements/{id}/html': {
          get: async ({ path: { id } }) => {
            const html = statementsService.html(id);
            return html ? htmlOk(html) : jsonNotFound({ message: 'NoHtml: Statement not found' });
          },
        },
        '/v2/statements/{id}/modifications': {
          post: async ({ path: { id }, body: { modification } }) => {
            const item = statementsService.modify(id, modification);
            return item ? jsonOk(item) : jsonNotFound({ message: 'Cannot modify: Statement not found' });
          },
        },
        '/v2/statements/{id}/pdf': {
          get: async ({ path: { id } }) => {
            const body = await statementsService.pdf(id);
            return body ? pdf(ok({ body })) : jsonNotFound({ message: 'NoPdf: Statement not found' });
          },
        },
      },
    });

    const logger = { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() };
    const withLogger = loggerMiddleware(logger);
    const http = new HttpService({ listener: withLogger(oapi), port: 4913 });
    await run({ services: [http] }, async () => {
      const api = axios.create({ baseURL: 'http://localhost:4913' });

      const { data: statementHtml } = await api.get('/v2/statements/111/html', {
        headers: { Authorization: 'Bearer Me' },
      });

      expect(statementHtml).toMatchSnapshot();

      const { data: statementPdf } = await api.get('/v2/statements/111/pdf', {
        headers: { Authorization: 'Bearer Me' },
      });

      expect(statementPdf).toMatchSnapshot();
    });
  });
});
