import {
  RequestOapi,
  OapiConfig,
  Empty,
  HttpApp,
  openApi,
  OapiSecurityResolver,
  OapiAuthInfo,
  ResponseOapi,
} from '@ovotech/laminar';

import { Readable } from 'stream';

export const openApiTyped = <R extends Empty = Empty, TAuthInfo extends OapiAuthInfo = OapiAuthInfo>(
  config: Config<R, TAuthInfo>,
): Promise<HttpApp<R>> => openApi(config);

export interface HealthCheck {
  healthy: boolean;
}

export type ResponseWellknownHealthcheckGet = ResponseOapi<HealthCheck, 200, 'application/json'>;

/**
 * Health check endpoint
 */
export type PathWellknownHealthcheckGet<R extends Empty = Empty> = (
  req: RequestOapi & R,
) => Promise<ResponseWellknownHealthcheckGet>;

export type ResponseWellknownOpenapiyamlGet = ResponseOapi<string | Readable | Buffer, 200, 'application/yaml'>;

/**
 * The open api spec for the service. OpenAPI v3.
 */
export type PathWellknownOpenapiyamlGet<R extends Empty = Empty> = (
  req: RequestOapi & R,
) => Promise<ResponseWellknownOpenapiyamlGet>;

export interface Status {
  isOutOfDate?: boolean;
  data: {
    name: string;
    type: 'bigquery' | 'kafka';
    isOutOfDate?: boolean;
    freshness?: string;
    freshnessText?: string;
  }[];
  consumptions: {
    id: number;
    topic: string;
    state?: 'started' | 'running' | 'error';
    updatedAt?: string;
    lag?: {
      partition: number;
      lag: string;
    }[];
    error?: string;
    errorAt?: string;
  }[];
  hydrations: {
    id: number;
    createdAt: string;
    name: string;
    state: 'started' | 'job_started' | 'job_finished' | 'loading' | 'finished' | 'error';
    interval: Interval;
    jobFinishedAt?: string;
    finishedAt?: string;
    totalItems?: number;
    processedItems?: number;
    errorAt?: string;
    error?: string;
  }[];
}

export interface Interval {
  start: string | string;
  end: string | string;
}

export type ResponseV1StatusGet = ResponseOapi<Status, 200, 'application/json'>;

/**
 * Status data for the hydrators and kafka consumers
 */
export type PathV1StatusGet<R extends Empty = Empty> = (req: RequestOapi & R) => Promise<ResponseV1StatusGet>;

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
  | ResponseOapi<HttpError, 500, 'application/json'>;

/**
 * Meter reads csv upload
 * Upload a csv meter reads.
 *
 */
export interface RequestV1HydrationMeterreadsPost<TAuthInfo> extends RequestOapi {
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
    '/v1/status': {
      /**
       * Status data for the hydrators and kafka consumers
       */
      get: PathV1StatusGet<R>;
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
