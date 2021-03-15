import axios from 'axios';
import { join } from 'path';
import { ObjectReadableMock } from 'stream-mock';
import {
  file,
  HttpService,
  text,
  textOk,
  form,
  json,
  jsonOk,
  binary,
  ok,
  setCookie,
  jsonNotFound,
  csv,
  css,
  html,
  xml,
  pdf,
  yaml,
  optional,
  run,
} from '../src';

const api = axios.create({ baseURL: 'http://localhost:8052' });

describe('Requests', () => {
  it('Should process response', async () => {
    const http = new HttpService({ port: 8052, listener: async () => textOk('Test') });
    await run({ services: [http] }, async () => {
      await expect(api.get('/test')).resolves.toMatchObject({
        headers: expect.objectContaining({
          'content-type': 'text/plain',
          'content-length': '4',
        }),
        data: 'Test',
      });
    });
  });

  it('Should process json', async () => {
    const http = new HttpService({
      port: 8052,
      listener: async () => jsonOk({ other: 'stuff', at: new Date('2020-02-02T12:00:00Z'), no: undefined }),
    });
    await run({ services: [http] }, async () => {
      await expect(api.get('/test')).resolves.toMatchObject({
        headers: expect.objectContaining({
          'content-type': 'application/json',
          'content-length': '49',
        }),
        data: { other: 'stuff', at: '2020-02-02T12:00:00.000Z' },
      });
    });
  });

  it('Should process buffer', async () => {
    const http = new HttpService({
      port: 8052,
      listener: async () => binary(ok({ body: Buffer.from('test-test-maaaany-test') })),
    });
    await run({ services: [http] }, async () => {
      await expect(api.get('/test')).resolves.toMatchObject({
        headers: expect.objectContaining({
          'content-type': 'application/octet-stream',
          'content-length': '22',
        }),
        data: 'test-test-maaaany-test',
      });
    });
  });

  it('Should process stream', async () => {
    const http = new HttpService({
      port: 8052,
      listener: async () => textOk(new ObjectReadableMock(['test-', 'test-', 'maaaany-', 'test'])),
    });
    await run({ services: [http] }, async () => {
      await expect(api.get('/test')).resolves.toMatchObject({
        headers: expect.objectContaining({
          'content-type': 'text/plain',
        }),
        data: 'test-test-maaaany-test',
      });
    });
  });

  it('Should process laminar simple response', async () => {
    const http = new HttpService({ port: 8052, listener: async () => text({ body: '', status: 201 }) });
    await run({ services: [http] }, async () => {
      await expect(api.get('/test')).resolves.toMatchObject({
        status: 201,
        headers: expect.objectContaining({
          'content-type': 'text/plain',
          'content-length': '0',
        }),
        data: '',
      });
    });
  });

  it('Should process laminar response', async () => {
    const http = new HttpService({
      port: 8052,
      listener: async () =>
        setCookie(
          { me: { value: 'test', httpOnly: true, maxAge: 1000 }, other: 'test2' },
          json({
            body: { some: 'stuff', at: new Date('2020-02-02T12:00:00Z'), no: undefined },
            status: 201,
            headers: { 'X-Response': 'other' },
          }),
        ),
    });
    await run({ services: [http] }, async () => {
      await expect(api.get('/test')).resolves.toMatchObject({
        status: 201,
        headers: expect.objectContaining({
          'content-type': 'application/json',
          'content-length': '48',
          'set-cookie': ['me=test; Max-Age=1000; HttpOnly', 'other=test2'],
          'x-response': 'other',
        }),
        data: { some: 'stuff', at: '2020-02-02T12:00:00.000Z' },
      });
    });
  });

  it('Should process laminar message', async () => {
    const http = new HttpService({
      port: 8052,
      listener: async () => jsonNotFound({ message: 'test' }),
    });
    await run({ services: [http] }, async () => {
      await expect(api.get('/test').catch((error) => error.response)).resolves.toMatchObject({
        status: 404,
        data: { message: 'test' },
      });
    });
  });

  it('Should process json responds for undefined', async () => {
    let data: { message: string } | undefined;

    const http = new HttpService({
      port: 8052,
      listener: async () => optional(jsonOk, data) ?? jsonNotFound({ message: 'not found' }),
    });
    await run({ services: [http] }, async () => {
      data = { message: 'test' };
      await expect(api.get('/test')).resolves.toMatchObject({
        status: 200,
        data: { message: 'test' },
      });

      data = undefined;
      await expect(api.get('/test').catch((error) => error.response)).resolves.toMatchObject({
        status: 404,
        data: { message: 'not found' },
      });
    });
  });

  it('Should process laminar text file', async () => {
    const http = new HttpService({
      port: 8052,
      listener: async () => file(join(__dirname, 'test.txt')),
    });
    await run({ services: [http] }, async () => {
      await expect(api.get('/test')).resolves.toMatchObject({
        status: 200,
        headers: expect.objectContaining({
          'content-length': '11',
          'content-type': 'text/plain',
        }),
        data: 'some stuff\n',
      });
    });
  });

  it('Should process laminar html file', async () => {
    const http = new HttpService({
      port: 8052,
      listener: async () => file(join(__dirname, 'test.html')),
    });
    await run({ services: [http] }, async () => {
      await expect(api.get('/test')).resolves.toMatchObject({
        status: 200,
        headers: expect.objectContaining({
          'content-length': '14',
          'content-type': 'text/html',
        }),
        data: '<html></html>\n',
      });
    });
  });

  it('Should process laminar file with status', async () => {
    const http = new HttpService({
      port: 8052,
      listener: async () => file(join(__dirname, 'test.txt'), { status: 201 }),
    });
    await run({ services: [http] }, async () => {
      await expect(api.get('/test')).resolves.toMatchObject({
        status: 201,
        data: 'some stuff\n',
      });
    });
  });

  it('Should process response type csv', async () => {
    const http = new HttpService({
      port: 8052,
      listener: async () => csv(ok({ body: 'one,two' })),
    });
    await run({ services: [http] }, async () => {
      await expect(api.get('/test')).resolves.toMatchObject({
        headers: expect.objectContaining({ 'content-type': 'text/csv' }),
        data: 'one,two',
      });
    });
  });

  it('Should process response type css', async () => {
    const http = new HttpService({
      port: 8052,
      listener: async () => css(ok({ body: 'html { backgroun: red; }' })),
    });
    await run({ services: [http] }, async () => {
      await expect(api.get('/test')).resolves.toMatchObject({
        headers: expect.objectContaining({ 'content-type': 'text/css' }),
        data: 'html { backgroun: red; }',
      });
    });
  });

  it('Should process response type html', async () => {
    const http = new HttpService({
      port: 8052,
      listener: async () => html(ok({ body: '<html></html>' })),
    });
    await run({ services: [http] }, async () => {
      await expect(api.get('/test')).resolves.toMatchObject({
        headers: expect.objectContaining({ 'content-type': 'text/html' }),
        data: '<html></html>',
      });
    });
  });

  it('Should process response type text', async () => {
    const http = new HttpService({
      port: 8052,
      listener: async () => text(ok({ body: 'txt' })),
    });
    await run({ services: [http] }, async () => {
      await expect(api.get('/test')).resolves.toMatchObject({
        headers: expect.objectContaining({ 'content-type': 'text/plain' }),
        data: 'txt',
      });
    });
  });

  it('Should process response type form', async () => {
    const http = new HttpService({
      port: 8052,
      listener: async () => form(ok({ body: { one: 'foo', two: 'bar' } })),
    });
    await run({ services: [http] }, async () => {
      await expect(api.get('/test')).resolves.toMatchObject({
        headers: expect.objectContaining({ 'content-type': 'application/x-www-form-urlencoded' }),
        data: 'one=foo&two=bar',
      });
    });
  });

  it('Should process response type xml', async () => {
    const http = new HttpService({
      port: 8052,
      listener: async () => xml(ok({ body: '<xml></xml>' })),
    });
    await run({ services: [http] }, async () => {
      await expect(api.get('/test')).resolves.toMatchObject({
        headers: expect.objectContaining({ 'content-type': 'application/xml' }),
        data: '<xml></xml>',
      });
    });
  });

  it('Should process response type pdf', async () => {
    const http = new HttpService({
      port: 8052,
      listener: async () => pdf(ok({ body: 'tmp' })),
    });
    await run({ services: [http] }, async () => {
      await expect(api.get('/test')).resolves.toMatchObject({
        headers: expect.objectContaining({ 'content-type': 'application/pdf' }),
      });
    });
  });

  it('Should process response type binary', async () => {
    const http = new HttpService({
      port: 8052,
      listener: async () => binary(ok({ body: 'tmp' })),
    });
    await run({ services: [http] }, async () => {
      await expect(api.get('/test')).resolves.toMatchObject({
        headers: expect.objectContaining({ 'content-type': 'application/octet-stream' }),
      });
    });
  });

  it('Should process response type yaml', async () => {
    const http = new HttpService({
      port: 8052,
      listener: async () => yaml(ok({ body: 'tmp' })),
    });
    await run({ services: [http] }, async () => {
      await expect(api.get('/test')).resolves.toMatchObject({
        headers: expect.objectContaining({ 'content-type': 'application/yaml' }),
      });
    });
  });

  it('Should process laminar file with status', async () => {
    const http = new HttpService({
      port: 8052,
      listener: async () => file(join(__dirname, 'test.txt'), { status: 201 }),
    });
    await run({ services: [http] }, async () => {
      await expect(api.get('/test')).resolves.toMatchObject({
        status: 201,
        data: 'some stuff\n',
      });
    });
  });

  it('Should process laminar file with range', async () => {
    const http = new HttpService({
      port: 8052,
      listener: async ({ incommingMessage }) => file(join(__dirname, 'test.txt'), { incommingMessage }),
    });
    await run({ services: [http] }, async () => {
      await expect(api.get('/test', { headers: { Range: 'bytes=0-3' } })).resolves.toMatchObject({
        status: 206,
        headers: expect.objectContaining({
          'content-range': 'bytes 0-3/11',
        }),
        data: 'some',
      });

      await expect(api.get('/test', { headers: { Range: 'bytes=5-9' } })).resolves.toMatchObject({
        status: 206,
        headers: expect.objectContaining({
          'content-range': 'bytes 5-9/11',
        }),
        data: 'stuff',
      });

      await expect(
        api.get('/test', { headers: { Range: 'bytes=9-12' } }).catch((error) => error.response),
      ).resolves.toMatchObject({
        status: 416,
        headers: expect.objectContaining({
          'content-range': 'bytes */11',
        }),
        data: '',
      });
    });
  });
});
