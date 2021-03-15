/* eslint-disable @typescript-eslint/no-explicit-any */
import { Schema } from '@ovotech/json-schema';
import { Empty } from '../../../types';
import { ResolvedOperationObject } from './resolved-openapi-object';
import { OpenAPIObject, SecurityRequirementObject, SecuritySchemeObject } from 'openapi3-ts';
import { HttpContext, HttpListener, HttpResponse } from '../../types';

export interface OapiPath {
  [key: string]: string;
}

/**
 * The authorized user, returned by {@link OapiSecurityResolver}
 */
export type OapiAuthInfo = any;

export interface SecurityOk<TOapiAuthInfo extends OapiAuthInfo = OapiAuthInfo> {
  authInfo: TOapiAuthInfo;
}

export type Security<TOapiAuthInfo extends OapiAuthInfo = OapiAuthInfo> = SecurityOk<TOapiAuthInfo> | HttpResponse;

export interface RequestSecurityResolver {
  scopes?: string[];
  securityScheme: SecuritySchemeObject;
}

export type OapiSecurityResolver<TContext extends Empty = Empty, TOapiAuthInfo extends OapiAuthInfo = OapiAuthInfo> = (
  req: TContext & HttpContext & OapiContext & RequestSecurityResolver,
) => Security<TOapiAuthInfo> | HttpResponse | Promise<Security<TOapiAuthInfo> | HttpResponse>;

export interface OapiSecurity<TContext extends Empty = Empty, TOapiAuthInfo extends OapiAuthInfo = OapiAuthInfo> {
  [key: string]: OapiSecurityResolver<TContext, TOapiAuthInfo>;
}

export interface OapiContext {
  path: any;
  headers: any;
  cookies: any;
  query: any;
}

export type AppRouteOapi<TContext extends Empty = Empty> = HttpListener<TContext & OapiContext & SecurityOk>;

export interface ResponseOapi<Content, Status, Type> {
  body: Content;
  status: Status;
  headers: { 'content-type': Type } & HttpResponse['headers'];
}

export interface OapiPaths<TContext extends Empty> {
  [path: string]: { [method: string]: AppRouteOapi<TContext> };
}

export interface OapiConfig<TContext extends Empty = Empty, TOapiAuthInfo extends OapiAuthInfo = OapiAuthInfo> {
  api: OpenAPIObject | string;
  paths: OapiPaths<TContext>;
  security?: OapiSecurity<TContext, TOapiAuthInfo>;
  notFound?: HttpListener<TContext>;
}

export type Matcher = (req: HttpContext) => OapiPath | false;

/**
 * A function that will convert a request into desired types.
 */
export type Coerce<TContext extends Empty = Empty> = (
  req: TContext & HttpContext & OapiContext,
) => TContext & HttpContext & OapiContext;

/**
 * @typeParam TContext pass the request properties that the app requires. Usually added by the middlewares
 */
export interface Route<TContext extends Empty> {
  matcher: Matcher;
  request: Schema;
  coerce: Coerce<TContext>;
  response: Schema;
  operation: ResolvedOperationObject;
  security?: SecurityRequirementObject[];
  resolver: HttpListener<TContext & OapiContext & SecurityOk>;
}
