import axios from 'axios';
import * as LRU from 'lru-cache';
import { validate, Schema } from '@ovotech/json-schema';
import { GetPublicKeyOrSecret } from 'jsonwebtoken';
import { certToPEM, rsaPublicKeyToPEM } from './helpers';

export interface JWKHandlerOptions {
  maxAge?: number;
  cache?: boolean;
  uri: string;
}

interface JWK {
  keys: Array<{ kid: string; use: string; kty: string } & ({ x5c: string[] } | { n: string; e: string })>;
}

const jwkSchema = (kid: string): Schema => ({
  properties: {
    keys: {
      type: 'array',
      minItems: 1,
      contains: {
        allOf: [
          {
            properties: { kid: { const: kid }, use: { const: 'sig' }, kty: { const: 'RSA' } },
            required: ['kid', 'use', 'kty'],
          },
          {
            anyOf: [
              {
                properties: { x5c: { minItems: 1, items: { type: 'string' } } },
                required: ['x5c'],
              },
              {
                properties: { n: { type: 'string' }, e: { type: 'string' } },
                required: ['n', 'e'],
              },
            ],
          },
        ],
      },
    },
  },
});

export const jwkPublicKey = ({ uri, maxAge, cache = false }: JWKHandlerOptions): GetPublicKeyOrSecret => {
  const lru = new LRU<string, JWK>({ maxAge });

  return async (header, callback) => {
    try {
      if (!header.kid) {
        throw new Error('Missing kid from token header');
      }
      if (header.alg !== 'RS256') {
        throw new Error('Only support RS256 algorithm');
      }
      let data = cache && lru.get(header.kid);
      if (!data) {
        data = (await axios.get<JWK>(uri)).data;
        const result = await validate({ schema: jwkSchema(header.kid), value: data, name: 'JWK' });
        if (!result.valid) {
          throw new Error(`JWK invalid, errors: ${result.errors}`);
        }
        if (cache) {
          lru.set(header.kid, data);
        }
      }

      /* eslint-disable-next-line @typescript-eslint/no-non-null-assertion */
      const key = data.keys.find((key) => key.kid === header.kid)!;
      const signingKey = 'x5c' in key ? certToPEM(key.x5c[0]) : rsaPublicKeyToPEM(key.n, key.e);

      callback(undefined, signingKey);
    } catch (error) {
      callback(error);
    }
  };
};
