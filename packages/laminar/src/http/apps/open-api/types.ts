/* eslint-disable @typescript-eslint/no-explicit-any */
import { Schema } from '@ovotech/json-schema';
import { Empty } from '../../../types';
import { ResolvedOperationObject } from './resolved-openapi-object';
import { OpenAPIObject, SecurityRequirementObject, SecuritySchemeObject } from 'openapi3-ts';
import { HttpRequest, HttpApp, HttpResponse } from '../../types';

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

export type OapiSecurityResolver<TRequest extends Empty = Empty, TOapiAuthInfo extends OapiAuthInfo = OapiAuthInfo> = (
  req: TRequest & HttpRequest & RequestOapi & RequestSecurityResolver,
) => Security<TOapiAuthInfo> | HttpResponse | Promise<Security<TOapiAuthInfo> | HttpResponse>;

export interface OapiSecurity<TRequest extends Empty = Empty, TOapiAuthInfo extends OapiAuthInfo = OapiAuthInfo> {
  [key: string]: OapiSecurityResolver<TRequest, TOapiAuthInfo>;
}

export interface RequestOapi {
  path: any;
  headers: any;
  cookies: any;
  query: any;
}

export type AppRouteOapi<TRequest extends Empty = Empty> = HttpApp<TRequest & RequestOapi & SecurityOk>;

export interface ResponseOapi<Content, Status, Type> {
  body: Content;
  status: Status;
  headers: { 'content-type': Type } & HttpResponse['headers'];
}

export interface OapiPaths<TRequest extends Empty> {
  [path: string]: { [method: string]: AppRouteOapi<TRequest> };
}

export interface OapiConfig<TRequest extends Empty = Empty, TOapiAuthInfo extends OapiAuthInfo = OapiAuthInfo> {
  api: OpenAPIObject | string;
  paths: OapiPaths<TRequest>;
  security?: OapiSecurity<TRequest, TOapiAuthInfo>;
  notFound?: HttpApp<TRequest>;
}

export type Matcher = (req: HttpRequest) => OapiPath | false;

/**
 * A function that will convert a request into desired types.
 */
export type Coerce<TRequest extends Empty = Empty> = (
  req: TRequest & HttpRequest & RequestOapi,
) => TRequest & HttpRequest & RequestOapi;

/**
 * @typeParam TRequest pass the request properties that the app requires. Usually added by the middlewares
 */
export interface Route<TRequest extends Empty> {
  matcher: Matcher;
  request: Schema;
  coerce: Coerce<TRequest>;
  response: Schema;
  operation: ResolvedOperationObject;
  security?: SecurityRequirementObject[];
  resolver: HttpApp<TRequest & RequestOapi & SecurityOk>;
}
