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

export const openApiTyped = <R extends Empty = Empty, TAuthInfo extends OapiAuthInfo = OapiAuthInfo>(
  config: Config<R, TAuthInfo>,
): Promise<HttpListener<R>> => openApi(config);

export interface CreateSession {
  email: string;
  scopes?: string[];
  other?: string;
}

export interface Session {
  jwt: string;
  expiresAt?: string;
  notBefore?: string;
  user: User;
}

export interface User {
  email: string;
  name?: string;
  picture?: string;
  scopes?: string[];
}

export interface HttpError {
  message?: string;
}

export type ResponseSessionPost =
  | ResponseOapi<Session, 200, 'application/json'>
  | ResponseOapi<HttpError, number, 'application/json'>;

/**
 * Cerate a new session
 */
export interface RequestSessionPost extends OapiContext {
  body: CreateSession;
}

export type PathSessionPost<R extends Empty = Empty> = (req: RequestSessionPost & R) => Promise<ResponseSessionPost>;

export interface Test {
  text: string;
  email?: string;
  scopes?: string[];
  [key: string]: unknown;
}

export type ResponseTestscopesGet =
  | ResponseOapi<Test, 200, 'application/json'>
  | ResponseOapi<HttpError, number, 'application/json'>;

/**
 * Secured by jwt with scopes
 */
export interface RequestTestscopesGet<TAuthInfo> extends OapiContext {
  authInfo: TAuthInfo;
}

export type PathTestscopesGet<R extends Empty = Empty, TAuthInfo extends OapiAuthInfo = OapiAuthInfo> = (
  req: RequestTestscopesGet<TAuthInfo> & R,
) => Promise<ResponseTestscopesGet>;

export type ResponseTestGet =
  | ResponseOapi<Test, 200, 'application/json'>
  | ResponseOapi<HttpError, number, 'application/json'>;

/**
 * Secured by jwt without scopes
 */
export interface RequestTestGet<TAuthInfo> extends OapiContext {
  authInfo: TAuthInfo;
}

export type PathTestGet<R extends Empty = Empty, TAuthInfo extends OapiAuthInfo = OapiAuthInfo> = (
  req: RequestTestGet<TAuthInfo> & R,
) => Promise<ResponseTestGet>;

export interface Config<R extends Empty = Empty, TAuthInfo extends OapiAuthInfo = OapiAuthInfo> extends OapiConfig<R> {
  paths: {
    '/session': {
      post: PathSessionPost<R>;
    };
    '/test-scopes': {
      get: PathTestscopesGet<R, TAuthInfo>;
    };
    '/test': {
      get: PathTestGet<R, TAuthInfo>;
    };
  };
  security: {
    JWTSecurity: OapiSecurityResolver<R, TAuthInfo>;
  };
}
