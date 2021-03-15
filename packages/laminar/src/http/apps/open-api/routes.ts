import { HttpContext } from '../../types';
import { Empty } from '../../../types';
import {
  ResolvedOpenAPIObject,
  ResolvedOperationObject,
  ResolvedParameterObject,
  ResolvedPathItemObject,
  ResolvedRequestBodyObject,
  ResolvedResponseObject,
} from './resolved-openapi-object';
import { OapiPaths, Route, Matcher, OapiPath, Coerce } from './types';
import { Schema } from '@ovotech/json-schema';
import { toMatchPattern, toPathKeys, toPathRe } from '../../../helpers';
import { SecurityRequirementObject, SecuritySchemeObject, SchemaObject } from 'openapi3-ts';

function toMatcher(path: string, method: string): Matcher {
  const uppercaseMethod = method.toUpperCase();
  const keys = toPathKeys(path);
  const re = toPathRe(path);
  return (req) => {
    if (!req.url.pathname || uppercaseMethod !== req.method) {
      return false;
    }

    const pathMatch = re.exec(req.url.pathname);
    if (pathMatch) {
      return pathMatch.slice(1).reduce((all, val, i) => ({ [keys[i]]: val, ...all }), {});
    }

    return false;
  };
}

/**
 * Convert an OpenApi parameter name into a parameter name from {@link RequestOapi}
 */
function toParamLocation(location: 'query' | 'header' | 'path' | 'cookie'): 'query' | 'headers' | 'path' | 'cookies' {
  switch (location) {
    case 'header':
      return 'headers';
    case 'cookie':
      return 'cookies';
    default:
      return location;
  }
}

/**
 * Convert an OpenApi parameter into a name that would exist in its location
 */
function toParamName(location: string, name: string): string {
  return location === 'header' ? name.toLowerCase() : name;
}

/**
 * Convert OpenApi parameter schema into an executable json-schema
 */
function toParameterSchema(param: ResolvedParameterObject): SchemaObject {
  const name = toParamName(param.in, param.name);

  return {
    properties: {
      [toParamLocation(param.in)]: {
        ...(param.required ? { required: [name] } : {}),
        ...(param.schema ? { properties: { [name]: param.schema } } : {}),
      },
    },
  };
}

/**
 * Convert a request body OpenApi schema into an executable json-schema
 */
function toRequestBodySchema(requestBody: ResolvedRequestBodyObject): Record<string, unknown> {
  return {
    ...(requestBody.required ? { required: ['body'] } : {}),
    ...(requestBody.content
      ? {
          discriminator: { propertyName: 'headers' },
          oneOf: Object.entries(requestBody.content).map(([match, mediaType]) => ({
            properties: {
              headers: {
                type: 'object',
                required: ['content-type'],
                properties: {
                  'content-type': { type: 'string', pattern: toMatchPattern(match) },
                },
              },
              body: mediaType.schema,
            },
          })),
        }
      : {}),
  };
}

/**
 * Validate a security schema, if there is no security resolver defined for a schema, raise an exception
 */
function toSecuritySchema(
  security: SecurityRequirementObject[],
  schemes: { [securityScheme: string]: SecuritySchemeObject },
): void {
  security.map((item) =>
    Object.entries(item).map(([name]) => {
      const scheme = schemes[name];

      if (!scheme) {
        throw new Error(`Security scheme ${name} not defined in components.securitySchemes in the OpenApi Schema`);
      }
    }),
  );
}

/**
 * Convert an OpenApi request schema into an executable json-schema.
 */
function toRequestSchema(
  { security: defaultSecurity, components }: ResolvedOpenAPIObject,
  { requestBody, parameters, security: operationSecurity }: ResolvedOperationObject,
  { parameters: commonParameters }: Pick<ResolvedPathItemObject, 'summary' | 'parameters' | 'description'>,
): Schema {
  const security = operationSecurity ?? defaultSecurity;
  const securitySchemes = components && components.securitySchemes;
  const allParameters = (parameters ?? []).concat(commonParameters ?? []);
  if (security && securitySchemes) {
    toSecuritySchema(security, securitySchemes);
  }
  return {
    allOf: [...allParameters.map(toParameterSchema), ...(requestBody ? [toRequestBodySchema(requestBody)] : [])],
  };
}

/**
 * Coerce raw string value into its intended type, based on the Json Schema
 * Since query parameters come only as string, but we still want to type them as "integer" or "boolean"
 * We attempt to coerce the type to the desired one
 */
type Coercer = (value: string, schema: SchemaObject | undefined) => unknown;

const trueString = ['true', 'yes', '1'];
const falseString = ['false', 'no', '0'];

const coercers: { [key: string]: Coercer } = {
  integer: (value) => {
    const num = Number(value);
    return Number.isInteger(num) ? num : value;
  },
  number: (value) => {
    const num = Number(value);
    return !Number.isNaN(num) ? num : value;
  },
  boolean: (value) => (trueString.includes(value) ? true : falseString.includes(value) ? false : value),
  null: (value) => (value === 'null' ? null : value),
  object: (value, schema: SchemaObject | undefined) =>
    Object.entries(value).reduce((acc, [name, propertyValue]) => {
      const propertySchema = schema?.properties?.[name] as SchemaObject;
      const coercer = coercers[propertySchema.type ?? ''];
      return {
        ...acc,
        [name]: coercer && propertyValue !== undefined ? coercer(propertyValue, propertySchema) : propertyValue,
      };
    }, {}),
};

/**
 * If a parameter is defined to be integer, attempt to convert the string value to integer first
 * Since all parameter values would be strings, this allows us to validate even numeric values
 * @param parameter
 */
function toParameterCoerce<TContext extends Empty>(parameter: ResolvedParameterObject): Coerce<TContext> | undefined {
  const coercer = coercers[parameter.schema?.type ?? ''];
  if (coercer) {
    return (req) => {
      const location = toParamLocation(parameter.in);
      const rawValue = req[location]?.[parameter.name];
      if (rawValue !== undefined) {
        const value = coercer(req[location][parameter.name], parameter.schema);
        return { ...req, [location]: { ...req[location], [parameter.name]: value } };
      } else {
        return req;
      }
    };
  } else {
    return undefined;
  }
}

/**
 * If a request has parameters, defined to be integer, attempt to convert the string value to integer first
 * Since all parameter values would be strings, this allows us to validate even numeric values
 */
function toRequestCoerce<TContext extends Empty>(
  { parameters }: ResolvedOperationObject,
  { parameters: commonParameters }: Pick<ResolvedPathItemObject, 'parameters'>,
): Coerce<TContext> {
  const allParameters = (parameters ?? []).concat(commonParameters ?? []);

  const coerceParameters = allParameters
    .map((item) => toParameterCoerce<TContext>(item))
    .filter((item): item is Coerce<TContext> => Boolean(item));

  return (req) => coerceParameters.reduce((acc, coerce) => coerce(acc), req);
}

/**
 * Convert an OpenApi response schema into an executable json-schema.
 */
function toResponseSchema({ responses }: ResolvedOperationObject): Record<string, unknown> {
  return {
    discriminator: { propertyName: 'status' },
    oneOf: Object.entries<ResolvedResponseObject>(responses).map(([status, response]) => ({
      type: 'object',
      properties: {
        status: status === 'default' ? true : { enum: [Number(status)] },
        ...(response.headers
          ? {
              headers: {
                allOf: Object.entries(response.headers).map(([header, headerType]) => ({
                  properties: { [header]: headerType.schema },
                })),
              },
            }
          : {}),
      },
      ...(response.content
        ? {
            discriminator: { propertyName: 'headers' },
            oneOf: Object.entries(response.content).map(([match, mediaType]) => ({
              properties: {
                headers: {
                  type: 'object',
                  required: ['content-type'],
                  properties: {
                    'content-type': { type: 'string', pattern: toMatchPattern(match) },
                  },
                },
                body:
                  mediaType.schema?.type === 'string'
                    ? {
                        oneOf: [mediaType.schema, { type: 'object', properties: { readable: { enum: [true] } } }],
                      }
                    : mediaType.schema,
              },
            })),
          }
        : {}),
    })),
  };
}

/**
 * Convert a resolver OpenApi schema object and some paths functions into a routed application
 * Each path would correspond to the correct resolver form the oapiPaths parameter.
 *
 * @param api
 * @param oapiPaths
 */
export function toRoutes<TContext extends Empty>(
  api: ResolvedOpenAPIObject,
  oapiPaths: OapiPaths<TContext>,
): Route<TContext>[] {
  return Object.entries(api.paths).reduce<Route<TContext>[]>((pathRoutes, [path, pathParameters]) => {
    const { parameters, summary, description, ...methods } = pathParameters;
    return [
      ...pathRoutes,
      ...Object.entries(methods).reduce<Route<TContext>[]>((methodRoutes, [method, operation]) => {
        return [
          ...methodRoutes,
          {
            request: toRequestSchema(api, operation, { parameters, summary, description }),
            response: toResponseSchema(operation),
            operation,
            coerce: toRequestCoerce(operation, { parameters }),
            security: operation.security || api.security,
            matcher: toMatcher(path, method),
            resolver: oapiPaths[path][method],
          },
        ];
      }, []),
    ];
  }, []);
}

/**
 * Attempt to match the routes from {@link toRoutes} sequentially.
 * If a route matches, return it plus the captured path parameters
 *
 * @typeParam TContext pass the request properties that the app requires. Usually added by the middlewares
 */
export function selectRoute<TContext extends Empty = Empty>(
  req: TContext & HttpContext,
  routes: Route<TContext>[],
): false | { path: OapiPath; route: Route<TContext> } {
  for (const route of routes) {
    const path = route.matcher(req);
    if (path) {
      return { route, path };
    }
  }
  return false;
}
