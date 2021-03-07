/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  CallbackObject,
  ComponentsObject,
  ContentObject,
  ExampleObject,
  ExamplesObject,
  HeaderObject,
  HeadersObject,
  LinkObject,
  LinksObject,
  MediaTypeObject,
  OpenAPIObject,
  OperationObject,
  ParameterObject,
  PathItemObject,
  PathsObject,
  RequestBodyObject,
  ResponseObject,
  ResponsesObject,
  SchemaObject,
  SecuritySchemeObject,
} from 'openapi3-ts';

export interface ResolvedOpenAPIObject extends OpenAPIObject {
  paths: ResolvedPathsObject;
  components?: ResolvedComponentsObject;
}

export interface ResolvedComponentsObject extends ComponentsObject {
  schemas?: { [schema: string]: SchemaObject };
  responses?: { [response: string]: ResolvedResponseObject };
  parameters?: { [parameter: string]: ResolvedParameterObject };
  examples?: { [example: string]: ExampleObject };
  requestBodies?: { [request: string]: ResolvedRequestBodyObject };
  headers?: { [heaer: string]: ResolvedHeaderObject };
  securitySchemes?: { [securityScheme: string]: SecuritySchemeObject };
  links?: { [link: string]: LinkObject };
  callbacks?: { [callback: string]: CallbackObject };
}

export interface ResolvedPathsObject extends PathsObject {
  [path: string]: ResolvedPathItemObject;
}

export interface ResolvedPathItemObject extends PathItemObject {
  get?: ResolvedOperationObject;
  put?: ResolvedOperationObject;
  post?: ResolvedOperationObject;
  delete?: ResolvedOperationObject;
  options?: ResolvedOperationObject;
  head?: ResolvedOperationObject;
  patch?: ResolvedOperationObject;
  trace?: ResolvedOperationObject;
  parameters?: ResolvedParameterObject[];
}

export interface ResolvedParameterObject extends ParameterObject {
  schema?: SchemaObject;
  examples?: { [param: string]: ExampleObject };
}

export interface ResolvedHeaderObject extends HeaderObject {
  schema?: SchemaObject;
  examples?: { [param: string]: ExampleObject };
}

export interface ResolvedOperationObject extends OperationObject {
  responses: ResolvedResponsesObject;
  parameters?: ResolvedParameterObject[];
  requestBody?: ResolvedRequestBodyObject;
}

export interface ResolvedRequestBodyObject extends RequestBodyObject {
  content: ContentObject;
}

export interface ResolvedMediaTypeObject extends MediaTypeObject {
  content: ContentObject;
  schema?: SchemaObject;
}

export interface ResolvedContentObject extends ContentObject {
  [mediatype: string]: ResolvedMediaTypeObject;
}

export interface ResolvedResponsesObject extends ResponsesObject {
  default?: ResolvedResponseObject;
  [statuscode: string]: ResolvedResponseObject | any;
}

export interface ResolvedResponseObject extends ResponseObject {
  content?: ResolvedContentObject;
  headers?: ResolvedHeadersObject;
}

export interface ResolvedHeadersObject extends HeadersObject {
  [name: string]: HeaderObject;
}

export interface ResolvedLinksObject extends LinksObject {
  [name: string]: LinkObject;
}

export interface ResolvedExamplesObject extends ExamplesObject {
  [name: string]: ExampleObject;
}
