import { HttpService, router, get, post, jsonOk, run } from '@ovotech/laminar';
import axios from 'axios';
import { join } from 'path';
import { jwtSecurityResolver, authMiddleware, jwkPublicKey, createSession } from '../src';
import { openApiTyped } from './__generated__/integration';
import { generateKeyPair } from 'crypto';
import { promisify } from 'util';
import * as nock from 'nock';
import { readFileSync } from 'fs';

describe('Integration', () => {
  it('Should process response for secret', async () => {
    const secret = '123';
    const jwtSecurity = jwtSecurityResolver({ secret });

    const listener = await openApiTyped({
      api: join(__dirname, 'integration.yaml'),
      security: { JWTSecurity: jwtSecurity },
      paths: {
        '/session': {
          post: async ({ body: { email, scopes } }) => jsonOk(createSession({ secret }, { email, scopes })),
        },
        '/test': {
          get: async ({ authInfo }) => jsonOk({ text: 'Test', ...authInfo }),
        },
        '/test-scopes': {
          get: async ({ authInfo }) => jsonOk({ text: 'Test', ...authInfo }),
        },
      },
    });

    const testTokenWithoutScopes = createSession({ secret }, { email: 'tester' }).jwt;
    const testTokenWithOtherScopes = createSession({ secret }, { email: 'tester', scopes: ['other'] }).jwt;
    const testTokenExpires = createSession({ secret, options: { expiresIn: '1ms' } }, { email: 'tester' }).jwt;
    const testTokenNotBefore = createSession({ secret, options: { notBefore: 10000 } }, { email: 'tester' }).jwt;

    const http = new HttpService({ listener, port: 8064 });

    await run({ services: [http] }, async () => {
      const api = axios.create({ baseURL: 'http://localhost:8064' });

      const { data: token } = await api.post('/session', {
        email: 'test@example.com',
        scopes: ['test1', 'plus'],
      });

      expect(token).toEqual({
        jwt: expect.any(String),
        user: { email: 'test@example.com', scopes: ['test1', 'plus'] },
      });

      const { data: data1 } = await api.get('/test', {
        headers: { authorization: `Bearer ${token.jwt}` },
      });

      expect(data1).toEqual({
        text: 'Test',
        email: 'test@example.com',
        iat: expect.any(Number),
        scopes: ['test1', 'plus'],
      });

      const { data: data2 } = await api.get('/test', {
        headers: { authorization: `Bearer ${testTokenWithoutScopes}` },
      });

      expect(data2).toEqual({
        text: 'Test',
        email: 'tester',
        iat: expect.any(Number),
      });

      const result3 = api.get('/test-scopes', {
        headers: { authorization: `Bearer ${testTokenWithoutScopes}` },
      });

      await expect(result3.catch((error) => error.response)).resolves.toMatchObject({
        status: 403,
        data: { message: 'Unauthorized. User does not have required scopes: [test1]' },
      });

      const result4 = api.get('/test-scopes', {
        headers: { authorization: `Bearer ${testTokenWithOtherScopes}` },
      });

      await expect(result4.catch((error) => error.response)).resolves.toMatchObject({
        status: 403,
        data: { message: 'Unauthorized. User does not have required scopes: [test1]' },
      });

      const result5 = api.get('/test', {
        headers: { authorization: `Bearer ${testTokenExpires}` },
      });

      await expect(result5.catch((error) => error.response)).resolves.toMatchObject({
        status: 403,
        data: {
          expiredAt: expect.any(String),
          message: 'Unauthorized. TokenExpiredError: jwt expired',
        },
      });

      const result6 = api.get('/test', {
        headers: { authorization: `Bearer ${testTokenNotBefore}` },
      });

      await expect(result6.catch((error) => error.response)).resolves.toMatchObject({
        status: 403,
        data: {
          date: expect.any(String),
          message: 'Unauthorized. NotBeforeError: jwt not active',
        },
      });

      const result7 = api.get('/test', {
        headers: { authorization: `Bearer Bearer wrong` },
      });

      await expect(result7.catch((error) => error.response)).resolves.toMatchObject({
        status: 403,
        data: {
          message: 'Unauthorized. JsonWebTokenError: jwt malformed',
        },
      });
    });
  });

  it('Should process response for public / private key pair and multiple options', async () => {
    const { publicKey, privateKey } = await promisify(generateKeyPair)('rsa', {
      modulusLength: 4096,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
        cipher: 'aes-256-cbc',
        passphrase: 'laminar secret',
      },
    });

    const signOptions = {
      secret: { key: privateKey, passphrase: 'laminar secret' },
      options: { audience: 'test audience', algorithm: 'RS256' as const },
    };

    const auth = authMiddleware({ secret: publicKey });

    const testTokenWithoutScopes = createSession(signOptions, { email: 'tester' }).jwt;

    const testTokenWithOtherScopes = createSession(signOptions, {
      email: 'tester',
      scopes: ['other'],
    }).jwt;

    const listener = router(
      post('/session', async ({ body: { email, scopes } }) => jsonOk(createSession(signOptions, { email, scopes }))),
      get(
        '/test',
        auth()(async ({ authInfo }) => jsonOk({ text: 'Test', ...authInfo })),
      ),
      get(
        '/test-scopes',
        auth(['test1'])(async ({ authInfo }) => jsonOk({ text: 'Test', ...authInfo })),
      ),
    );

    const http = new HttpService({ listener, port: 8063 });
    await run({ services: [http] }, async () => {
      const api = axios.create({ baseURL: 'http://localhost:8063' });

      const { data: token } = await api.post('/session', {
        email: 'test@example.com',
        scopes: ['test1', 'plus'],
      });

      expect(token).toEqual({
        jwt: expect.any(String),
        user: { email: 'test@example.com', scopes: ['test1', 'plus'] },
      });

      const { data: data1 } = await api.get('/test', {
        headers: { authorization: `Bearer ${token.jwt}` },
      });

      expect(data1).toEqual({
        text: 'Test',
        email: 'test@example.com',
        aud: 'test audience',
        iat: expect.any(Number),
        scopes: ['test1', 'plus'],
      });

      const { data: data2 } = await api.get('/test', {
        headers: { authorization: `Bearer ${testTokenWithoutScopes}` },
      });

      expect(data2).toEqual({
        aud: 'test audience',
        text: 'Test',
        email: 'tester',
        iat: expect.any(Number),
      });

      const result3 = api.get('/test-scopes', {
        headers: { authorization: `Bearer ${testTokenWithoutScopes}` },
      });

      await expect(result3.catch((error) => error.response)).resolves.toMatchObject({
        status: 403,
        data: {
          message: 'Unauthorized. User does not have required scopes: [test1]',
        },
      });

      const result4 = api.get('/test-scopes', {
        headers: { authorization: `Bearer ${testTokenWithOtherScopes}` },
      });

      await expect(result4.catch((error) => error.response)).resolves.toMatchObject({
        status: 403,
        data: {
          message: 'Unauthorized. User does not have required scopes: [test1]',
        },
      });
    });
  });

  it('Should process jwk urls, with caching and max age settings', async () => {
    const privateKey = readFileSync(join(__dirname, '../examples/private-key.pem'));
    const jwk = readFileSync(join(__dirname, '../examples/jwk.json'), 'utf8');
    const publicKey = jwkPublicKey({
      uri: 'http://example.com/.well-known/jwk.json',
      maxAge: 100,
      cache: true,
    });

    nock('http://example.com/').get('/.well-known/jwk.json').times(2).reply(200, JSON.parse(jwk));

    const signOptions = {
      secret: privateKey,
      options: { algorithm: 'RS256' as const, keyid: '54eb0f68-bbf5-44ae-a345-fbd56c50e1e8' },
    };
    const auth = authMiddleware({ secret: publicKey });

    const http = new HttpService({
      listener: router(
        post('/session', async ({ body: { email, scopes } }) => jsonOk(createSession(signOptions, { email, scopes }))),
        get(
          '/test',
          auth()(async ({ authInfo }) => jsonOk({ text: 'Test', ...authInfo })),
        ),
      ),
      port: 8065,
    });

    await run({ services: [http] }, async () => {
      const api = axios.create({ baseURL: 'http://localhost:8065' });

      const { data: token } = await api.post('/session', {
        email: 'test@example.com',
        scopes: ['test1', 'plus'],
      });

      expect(token).toEqual({
        jwt: expect.any(String),
        user: { email: 'test@example.com', scopes: ['test1', 'plus'] },
      });

      const { data: data1 } = await api.get('/test', {
        headers: { authorization: `Bearer ${token.jwt}` },
      });

      expect(data1).toEqual({
        text: 'Test',
        email: 'test@example.com',
        iat: expect.any(Number),
        scopes: ['test1', 'plus'],
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      await api.get('/test', { headers: { authorization: `Bearer ${token.jwt}` } });

      await new Promise((resolve) => setTimeout(resolve, 100));

      await api.get('/test', { headers: { authorization: `Bearer ${token.jwt}` } });
    });
  });
});
