import {
  OapiContext,
  OapiConfig,
  Empty,
  HttpListener,
  openApi,
  OapiSecurityResolver,
  OapiAuthInfo,
  ResponseOapi,
} from '@ovotech/laminar';

import { Readable } from 'stream';

export const openApiTyped = <R extends Empty = Empty, TAuthInfo extends OapiAuthInfo = OapiAuthInfo>(
  config: Config<R, TAuthInfo>,
): Promise<HttpListener<R>> => openApi(config);

export interface HealthCheck {
  healthy: boolean;
}

export type ResponseWellknownHealthcheckGet = ResponseOapi<HealthCheck, 200, 'application/json'>;

/**
 * Health check endpoint
 */
export type PathWellknownHealthcheckGet<R extends Empty = Empty> = (
  req: OapiContext & R,
) => Promise<ResponseWellknownHealthcheckGet>;

export type ResponseWellknownOpenapiyamlGet = ResponseOapi<string | Readable | Buffer, 200, 'application/yaml'>;

/**
 * The open api spec for the service. OpenAPI v3.
 */
export type PathWellknownOpenapiyamlGet<R extends Empty = Empty> = (
  req: OapiContext & R,
) => Promise<ResponseWellknownOpenapiyamlGet>;

export interface MeterRead {
  serialNumber: string;
  value: string;
  date?: string;
}

export type ResponseV1MeterreadsGet = ResponseOapi<MeterRead[], 200, 'application/json'>;

/**
 * Retern meter reads
 */
export type PathV1MeterreadsGet<R extends Empty = Empty> = (req: OapiContext & R) => Promise<ResponseV1MeterreadsGet>;

export interface HttpError {
  message?: string;
}

export type ResponseV1HydrationMeterreadsPost =
  | ResponseOapi<
      {
        success: boolean;
      },
      200,
      'application/json'
    >
  | ResponseOapi<HttpError, 400, 'application/json'>
  | ResponseOapi<HttpError, 500, 'application/json'>;

/**
 * Meter reads csv upload
 * Upload a csv meter reads.
 *
 */
export interface RequestV1HydrationMeterreadsPost<TAuthInfo> extends OapiContext {
  headers: {
    /**
     * An optional trace token to be passed to the service and used for logging
     */
    'x-trace-token'?: string;
  };
  body?: any;
  authInfo: TAuthInfo;
}

/**
 * Upload a csv meter reads.
 *
 */
export type PathV1HydrationMeterreadsPost<R extends Empty = Empty, TAuthInfo extends OapiAuthInfo = OapiAuthInfo> = (
  req: RequestV1HydrationMeterreadsPost<TAuthInfo> & R,
) => Promise<ResponseV1HydrationMeterreadsPost>;

export interface Config<R extends Empty = Empty, TAuthInfo extends OapiAuthInfo = OapiAuthInfo> extends OapiConfig<R> {
  paths: {
    '/.well-known/health-check': {
      /**
       * Health check endpoint
       */
      get: PathWellknownHealthcheckGet<R>;
    };
    '/.well-known/openapi.yaml': {
      /**
       * The open api spec for the service. OpenAPI v3.
       */
      get: PathWellknownOpenapiyamlGet<R>;
    };
    '/v1/meter-reads': {
      /**
       * Retern meter reads
       */
      get: PathV1MeterreadsGet<R>;
    };
    '/v1/hydration/meter-reads': {
      /**
       * Upload a csv meter reads.
       *
       */
      post: PathV1HydrationMeterreadsPost<R, TAuthInfo>;
    };
  };
  security: {
    BearerAuth: OapiSecurityResolver<R, TAuthInfo>;
  };
}
