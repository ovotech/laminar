import axios from 'axios';
import * as FormData from 'form-data';
import { createReadStream, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { Context, HttpServer, testRun, textOk } from '../src';

const app = jest.fn().mockReturnValue(textOk('Test'));
const api = axios.create({ baseURL: 'http://localhost:8051' });

const context: Context = { services: [new HttpServer({ app, port: 8051 })] };

describe('Requests', () => {
  beforeEach(() => app.mockClear());

  it(
    'Should process request',
    testRun(context, async () => {
      const result = await api.get('/test2');
      expect(app).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.objectContaining({ pathname: '/test2' }),
          headers: expect.objectContaining({ host: 'localhost:8051' }),
          method: 'GET',
        }),
      );
      expect(result.status).toEqual(200);
      expect(result.data).toEqual('Test');
    }),
  );

  it(
    'Should parse headers',
    testRun(context, async () => {
      const result = await api.get('/other-test/123', {
        headers: { Authorization: 'Bearer 234' },
      });
      expect(app).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.objectContaining({ pathname: '/other-test/123' }),
          headers: expect.objectContaining({ authorization: 'Bearer 234' }),
          method: 'GET',
        }),
      );
      expect(result.data).toEqual('Test');
    }),
  );

  it(
    'Should parse search params',
    testRun(context, async () => {
      const result = await api.get('/me', {
        params: { this: 'other', last: 'new' },
      });
      expect(app.mock.calls[0][0].url.searchParams.toString()).toEqual('this=other&last=new');
      expect(result.data).toEqual('Test');
    }),
  );

  it(
    'Should parse search query',
    testRun(context, async () => {
      const result = await api.get('/me', {
        params: { this: 'other', last: 'new' },
      });
      expect(app).toHaveBeenCalledWith(
        expect.objectContaining({
          query: { this: 'other', last: 'new' },
        }),
      );
      expect(result.data).toEqual('Test');
    }),
  );

  it(
    'Should parse nested search query',
    testRun(context, async () => {
      const result = await api.get('/me?this[one][two]=other&arr[]=111');
      expect(app).toHaveBeenCalledWith(
        expect.objectContaining({
          query: { this: { one: { two: 'other' } }, arr: ['111'] },
        }),
      );
      expect(result.data).toEqual('Test');
    }),
  );

  it(
    'Should parse cookies',
    testRun(context, async () => {
      const result = await api.get('http://localhost:8051/login', {
        headers: { cookie: 'accessToken=1234abc; userId=1234' },
      });
      expect(app).toHaveBeenCalledWith(
        expect.objectContaining({
          cookies: { accessToken: '1234abc', userId: '1234' },
        }),
      );
      expect(result.data).toEqual('Test');
    }),
  );

  it(
    'Should parse json',
    testRun(context, async () => {
      const result = await api.post('/login', { test: 'other' });

      expect(app).toHaveBeenCalledWith(expect.objectContaining({ body: { test: 'other' }, method: 'POST' }));
      expect(result.data).toEqual('Test');
    }),
  );

  it(
    'Should parse json like',
    testRun(context, async () => {
      const result = await api.post(
        '/swish',
        { test: 'other' },
        {
          headers: { 'Content-Type': 'application/vnd.schemaregistry.v1+json' },
        },
      );

      expect(app).toHaveBeenCalledWith(expect.objectContaining({ body: { test: 'other' }, method: 'POST' }));

      expect(result.data).toEqual('Test');
    }),
  );

  it(
    'Should parse url',
    testRun(context, async () => {
      const result = await api.post('/logout', 'one=other', {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      expect(app).toHaveBeenCalledWith(expect.objectContaining({ body: { one: 'other' }, method: 'POST' }));

      expect(result.data).toEqual('Test');
    }),
  );

  it(
    'Should parse text',
    testRun(context, async () => {
      const result = await api.post('/post', 'document { height: 100%; }', {
        headers: { 'Content-Type': 'text/css' },
      });

      expect(app).toHaveBeenCalledWith(expect.objectContaining({ body: 'document { height: 100%; }', method: 'POST' }));

      expect(result.data).toEqual('Test');
    }),
  );

  it(
    'Should parse single file multipart',
    testRun(context, async () => {
      const formData = new FormData();

      formData.append('name', 'test-name');
      formData.append('age', 21);
      formData.append('file', createReadStream(join(__dirname, 'test.html')), {
        knownLength: statSync(join(__dirname, 'test.html')).size,
      });

      const result = await api.post('/post', formData, {
        headers: { ...formData.getHeaders(), 'Content-Length': formData.getLengthSync() },
      });

      expect(app).toHaveBeenCalledWith(
        expect.objectContaining({
          body: {
            name: 'test-name',
            age: '21',
            file: [
              {
                filename: 'test.html',
                data: readFileSync(join(__dirname, 'test.html')),
                type: 'text/html',
                name: 'file',
              },
            ],
          },
          method: 'POST',
        }),
      );

      expect(result.data).toEqual('Test');
    }),
  );

  it(
    'Should parse multiple files multipart',
    testRun(context, async () => {
      const formData = new FormData();

      formData.append('name', 'test-name');
      formData.append('age', 21);
      formData.append('file', createReadStream(join(__dirname, 'test.html')), {
        knownLength: statSync(join(__dirname, 'test.html')).size,
      });

      formData.append('file', createReadStream(join(__dirname, 'test.txt')), {
        knownLength: statSync(join(__dirname, 'test.txt')).size,
      });
      const result = await api.post('/post', formData, {
        headers: { ...formData.getHeaders(), 'Content-Length': formData.getLengthSync() },
      });

      expect(app).toHaveBeenCalledWith(
        expect.objectContaining({
          body: {
            name: 'test-name',
            age: '21',
            file: [
              {
                filename: 'test.html',
                data: readFileSync(join(__dirname, 'test.html')),
                type: 'text/html',
                name: 'file',
              },
              {
                filename: 'test.txt',
                data: readFileSync(join(__dirname, 'test.txt')),
                type: 'text/plain',
                name: 'file',
              },
            ],
          },
          method: 'POST',
        }),
      );

      expect(result.data).toEqual('Test');
    }),
  );

  it(
    'Should parse large multipart in streaming chunks',
    testRun(context, async () => {
      const formData = new FormData();

      const htmlFile = readFileSync(join(__dirname, 'test.html'));

      for (let i = 0; i < 1000; i++) {
        formData.append(`name-${i}`, 'test-name');
        formData.append(`age-${i}`, 21);
        formData.append(`file-${i}`, htmlFile, { contentType: 'text/html', filename: 'test.html' });
      }

      const result = await api.post('/post', formData, {
        headers: { ...formData.getHeaders(), 'Content-Length': formData.getLengthSync() },
      });

      expect(app).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            'name-999': 'test-name',
            'age-999': '21',
            'file-999': [
              {
                filename: 'test.html',
                data: htmlFile,
                type: 'text/html',
                name: 'file-999',
              },
            ],
          }),
          method: 'POST',
        }),
      );

      expect(result.data).toEqual('Test');
    }),
  );

  it(
    'Should handle malformed content type',
    testRun(context, async () => {
      const result = await api.post('http://localhost:8051/post', 'test', {
        headers: { 'Content-Type': '123123' },
      });

      expect(app).toHaveBeenCalledWith(expect.objectContaining({ body: 'test', method: 'POST' }));

      expect(result.data).toEqual('Test');
    }),
  );

  it(
    'Should handle unknown content type, fallback to text',
    testRun(context, async () => {
      const result = await api.post('http://localhost:8051/post', 'test', {
        headers: { 'Content-Type': 'some/other' },
      });

      expect(app).toHaveBeenCalledWith(expect.objectContaining({ body: 'test', method: 'POST' }));

      expect(result.data).toEqual('Test');
    }),
  );

  it(
    'Should handle malformed json',
    testRun(context, async () => {
      await expect(
        api
          .post('http://localhost:8051/post', '{"test":Date}', {
            transformRequest: [],
            headers: { 'Content-Type': 'application/json' },
          })
          .catch((error) => error.response),
      ).resolves.toMatchObject({
        status: 400,
        data: {
          message: 'Error Parsing Request Body: "Unexpected token D in JSON at position 8" with parser: JsonBodyParser',
        },
      });

      expect(app).not.toHaveBeenCalled();
    }),
  );
});
