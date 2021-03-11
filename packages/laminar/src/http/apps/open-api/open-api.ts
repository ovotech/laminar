import { validateCompiled, toSchemaObject, compileInContext, ResultError } from '@ovotech/json-schema';
import { Empty } from '../../../types';
import { jsonBadRequest, jsonInternalServerError, jsonNotFound } from '../../response';
import { RequestOapi, OapiConfig, Route } from './types';
import { compileOapi } from './compile-oapi';
import { toRoutes, selectRoute } from './routes';
import { toMatchPattern } from '../../../helpers';
import { isSecurityResponse, validateSecurity } from './security';
import { HttpRequest, HttpResponse, HttpApp } from '../../types';

/**
 * If a request doesn't conform to the defined OpenApi schema,
 * Attempt to return the most information in order to help the user correct the error
 */
function toRequestError<TRequest>(result: ResultError, route: Route<TRequest>, req: HttpRequest): HttpResponse {
  const contentMediaTypes = Object.entries(route.operation.requestBody?.content ?? {});
  const mediaType =
    contentMediaTypes.find(([mimeType]) =>
      new RegExp(toMatchPattern(mimeType)).test(req.headers['content-type'] ?? ''),
    )?.[1] ?? route.operation.requestBody?.content['default'];

  return jsonBadRequest({
    message: `Request for "${req.method} ${req.url.pathname}" does not match OpenApi Schema`,
    schema: route.request,
    errors: result.errors,
    ...(route.operation.summary ? { summary: route.operation.summary } : {}),
    ...(route.operation.description ? { description: route.operation.description } : {}),
    ...(route.operation.deprecated ? { deprecated: route.operation.deprecated } : {}),
    ...(mediaType ? { requestBody: mediaType } : {}),
  });
}

/**
 * If no path is found, this function would be called by default, Returning a 404 error
 */
export const defaultOapiNotFound: HttpApp = async (req) =>
  jsonNotFound({
    message: `Request for "${req.method} ${req.url.pathname}" did not match any of the paths defined in the OpenApi Schema`,
  });

/**
 * Create an application using an OpenApi schema.
 * The api can be a filename (json or yaml) or a javascript object containing OpenApi Schema.
 * You also provide an {@link App} for each path. As well as all security resolvers
 *
 * @typeParam TRequest pass the request properties that the app requires. Usually added by the middlewares
 */
export async function openApi<TRequest extends Empty>(config: OapiConfig<TRequest>): Promise<HttpApp<TRequest>> {
  const oapi = await compileOapi(config);
  const routes = toRoutes<TRequest>(toSchemaObject(oapi), config.paths);
  const notFound = config.notFound ?? defaultOapiNotFound;

  return async (req) => {
    const select = selectRoute<TRequest>(req, routes);

    if (!select) {
      return notFound(req);
    }

    const reqOapi: TRequest & HttpRequest & RequestOapi = select.route.coerce({
      ...req,
      authInfo: undefined,
      path: select.path,
    });

    const checkRequest = validateCompiled({
      schema: compileInContext(select.route.request, oapi),
      draft: 'openapi3',
      name: 'request',
      value: reqOapi,
    });

    if (!checkRequest.valid) {
      return toRequestError<TRequest>(checkRequest, select.route, req);
    }

    const security = await validateSecurity<TRequest>(
      reqOapi,
      select.route.security,
      oapi.schema.components?.securitySchemes,
      config.security,
    );

    if (security && isSecurityResponse(security)) {
      return security;
    }

    const res = await select.route.resolver({ ...reqOapi, authInfo: undefined, ...security });

    const checkResponse = validateCompiled({
      schema: compileInContext(select.route.response, oapi),
      value: res,
      draft: 'openapi3',
      name: 'response',
    });

    if (!checkResponse.valid) {
      return jsonInternalServerError({
        message: `Server response for "${req.method} ${req.url.pathname}" does not match OpenApi Schema`,
        errors: checkResponse.errors,
      });
    }

    return res;
  };
}
