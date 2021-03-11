import axios from 'axios';
import { join } from 'path';
import { ObjectReadableMock } from 'stream-mock';
import {
  file,
  HttpServer,
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
} from '../src';

const api = axios.create({ baseURL: 'http://localhost:8052' });

describe('Requests', () => {
  it('Should process response', async () => {
    const server = new HttpServer({ port: 8052, app: async () => textOk('Test') });
    try {
      await server.start();

      await expect(api.get('/test')).resolves.toMatchObject({
        headers: expect.objectContaining({
          'content-type': 'text/plain',
          'content-length': '4',
        }),
        data: 'Test',
      });
    } finally {
      await server.stop();
    }
  });

  it('Should process json', async () => {
    const server = new HttpServer({
      port: 8052,
      app: async () => jsonOk({ other: 'stuff', at: new Date('2020-02-02T12:00:00Z'), no: undefined }),
    });
    try {
      await server.start();

      await expect(api.get('/test')).resolves.toMatchObject({
        headers: expect.objectContaining({
          'content-type': 'application/json',
          'content-length': '49',
        }),
        data: { other: 'stuff', at: '2020-02-02T12:00:00.000Z' },
      });
    } finally {
      await server.stop();
    }
  });

  it('Should process buffer', async () => {
    const server = new HttpServer({
      port: 8052,
      app: async () => binary(ok({ body: Buffer.from('test-test-maaaany-test') })),
    });
    try {
      await server.start();

      await expect(api.get('/test')).resolves.toMatchObject({
        headers: expect.objectContaining({
          'content-type': 'application/octet-stream',
          'content-length': '22',
        }),
        data: 'test-test-maaaany-test',
      });
    } finally {
      await server.stop();
    }
  });

  it('Should process stream', async () => {
    const server = new HttpServer({
      port: 8052,
      app: async () => textOk(new ObjectReadableMock(['test-', 'test-', 'maaaany-', 'test'])),
    });
    try {
      await server.start();

      await expect(api.get('/test')).resolves.toMatchObject({
        headers: expect.objectContaining({
          'content-type': 'text/plain',
        }),
        data: 'test-test-maaaany-test',
      });
    } finally {
      await server.stop();
    }
  });

  it('Should process laminar simple response', async () => {
    const server = new HttpServer({ port: 8052, app: async () => text({ body: '', status: 201 }) });
    try {
      await server.start();

      await expect(api.get('/test')).resolves.toMatchObject({
        status: 201,
        headers: expect.objectContaining({
          'content-type': 'text/plain',
          'content-length': '0',
        }),
        data: '',
      });
    } finally {
      await server.stop();
    }
  });

  it('Should process laminar response', async () => {
    const server = new HttpServer({
      port: 8052,
      app: async () =>
        setCookie(
          { me: { value: 'test', httpOnly: true, maxAge: 1000 }, other: 'test2' },
          json({
            body: { some: 'stuff', at: new Date('2020-02-02T12:00:00Z'), no: undefined },
            status: 201,
            headers: { 'X-Response': 'other' },
          }),
        ),
    });
    try {
      await server.start();

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
    } finally {
      await server.stop();
    }
  });

  it('Should process laminar message', async () => {
    const server = new HttpServer({
      port: 8052,
      app: async () => jsonNotFound({ message: 'test' }),
    });
    try {
      await server.start();

      await expect(api.get('/test').catch((error) => error.response)).resolves.toMatchObject({
        status: 404,
        data: { message: 'test' },
      });
    } finally {
      await server.stop();
    }
  });

  it('Should process json responds for undefined', async () => {
    let data: { message: string } | undefined;

    const server = new HttpServer({
      port: 8052,
      app: async () => optional(jsonOk, data) ?? jsonNotFound({ message: 'not found' }),
    });
    try {
      await server.start();
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
    } finally {
      await server.stop();
    }
  });

  it('Should process laminar text file', async () => {
    const server = new HttpServer({
      port: 8052,
      app: async () => file(join(__dirname, 'test.txt')),
    });
    try {
      await server.start();

      await expect(api.get('/test')).resolves.toMatchObject({
        status: 200,
        headers: expect.objectContaining({
          'content-length': '11',
          'content-type': 'text/plain',
        }),
        data: 'some stuff\n',
      });
    } finally {
      await server.stop();
    }
  });

  it('Should process laminar html file', async () => {
    const server = new HttpServer({
      port: 8052,
      app: async () => file(join(__dirname, 'test.html')),
    });
    try {
      await server.start();

      await expect(api.get('/test')).resolves.toMatchObject({
        status: 200,
        headers: expect.objectContaining({
          'content-length': '14',
          'content-type': 'text/html',
        }),
        data: '<html></html>\n',
      });
    } finally {
      await server.stop();
    }
  });

  it('Should process laminar file with status', async () => {
    const server = new HttpServer({
      port: 8052,
      app: async () => file(join(__dirname, 'test.txt'), { status: 201 }),
    });
    try {
      await server.start();

      await expect(api.get('/test')).resolves.toMatchObject({
        status: 201,
        data: 'some stuff\n',
      });
    } finally {
      await server.stop();
    }
  });

  it('Should process response type csv', async () => {
    const server = new HttpServer({
      port: 8052,
      app: async () => csv(ok({ body: 'one,two' })),
    });
    try {
      await server.start();

      await expect(api.get('/test')).resolves.toMatchObject({
        headers: expect.objectContaining({ 'content-type': 'text/csv' }),
        data: 'one,two',
      });
    } finally {
      await server.stop();
    }
  });

  it('Should process response type css', async () => {
    const server = new HttpServer({
      port: 8052,
      app: async () => css(ok({ body: 'html { backgroun: red; }' })),
    });
    try {
      await server.start();

      await expect(api.get('/test')).resolves.toMatchObject({
        headers: expect.objectContaining({ 'content-type': 'text/css' }),
        data: 'html { backgroun: red; }',
      });
    } finally {
      await server.stop();
    }
  });

  it('Should process response type html', async () => {
    const server = new HttpServer({
      port: 8052,
      app: async () => html(ok({ body: '<html></html>' })),
    });
    try {
      await server.start();

      await expect(api.get('/test')).resolves.toMatchObject({
        headers: expect.objectContaining({ 'content-type': 'text/html' }),
        data: '<html></html>',
      });
    } finally {
      await server.stop();
    }
  });

  it('Should process response type text', async () => {
    const server = new HttpServer({
      port: 8052,
      app: async () => text(ok({ body: 'txt' })),
    });
    try {
      await server.start();

      await expect(api.get('/test')).resolves.toMatchObject({
        headers: expect.objectContaining({ 'content-type': 'text/plain' }),
        data: 'txt',
      });
    } finally {
      await server.stop();
    }
  });

  it('Should process response type form', async () => {
    const server = new HttpServer({
      port: 8052,
      app: async () => form(ok({ body: { one: 'foo', two: 'bar' } })),
    });
    try {
      await server.start();

      await expect(api.get('/test')).resolves.toMatchObject({
        headers: expect.objectContaining({ 'content-type': 'application/x-www-form-urlencoded' }),
        data: 'one=foo&two=bar',
      });
    } finally {
      await server.stop();
    }
  });

  it('Should process response type xml', async () => {
    const server = new HttpServer({
      port: 8052,
      app: async () => xml(ok({ body: '<xml></xml>' })),
    });
    try {
      await server.start();

      await expect(api.get('/test')).resolves.toMatchObject({
        headers: expect.objectContaining({ 'content-type': 'application/xml' }),
        data: '<xml></xml>',
      });
    } finally {
      await server.stop();
    }
  });

  it('Should process response type pdf', async () => {
    const server = new HttpServer({
      port: 8052,
      app: async () => pdf(ok({ body: 'tmp' })),
    });
    try {
      await server.start();

      await expect(api.get('/test')).resolves.toMatchObject({
        headers: expect.objectContaining({ 'content-type': 'application/pdf' }),
      });
    } finally {
      await server.stop();
    }
  });

  it('Should process response type binary', async () => {
    const server = new HttpServer({
      port: 8052,
      app: async () => binary(ok({ body: 'tmp' })),
    });
    try {
      await server.start();

      await expect(api.get('/test')).resolves.toMatchObject({
        headers: expect.objectContaining({ 'content-type': 'application/octet-stream' }),
      });
    } finally {
      await server.stop();
    }
  });

  it('Should process response type yaml', async () => {
    const server = new HttpServer({
      port: 8052,
      app: async () => yaml(ok({ body: 'tmp' })),
    });
    try {
      await server.start();

      await expect(api.get('/test')).resolves.toMatchObject({
        headers: expect.objectContaining({ 'content-type': 'application/yaml' }),
      });
    } finally {
      await server.stop();
    }
  });

  it('Should process laminar file with status', async () => {
    const server = new HttpServer({
      port: 8052,
      app: async () => file(join(__dirname, 'test.txt'), { status: 201 }),
    });
    try {
      await server.start();

      await expect(api.get('/test')).resolves.toMatchObject({
        status: 201,
        data: 'some stuff\n',
      });
    } finally {
      await server.stop();
    }
  });

  it('Should process laminar file with range', async () => {
    const server = new HttpServer({
      port: 8052,
      app: async ({ incommingMessage }) => file(join(__dirname, 'test.txt'), { incommingMessage }),
    });
    try {
      await server.start();

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
    } finally {
      await server.stop();
    }
  });
});
