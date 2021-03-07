import { compile, compileInContext, ensureValid, ResolvedSchema, Schema, toSchemaObject } from '@ovotech/json-schema';
import { openapiV3 } from 'openapi-schemas';
import { ResolvedOpenAPIObject } from './resolved-openapi-object';
import { OapiConfig } from './types';
import { Empty } from '../../../types';

/**
 * Compile an OpenApi file, loading all the referenced schemas.
 * Validate against the official OpenApi schema to make sure the api is valid.
 *
 * Additioanlly ensure that all the paths resolvers and security resolvers are present for all paths
 *
 * @typeParam TRequest pass the request properties that the app requires. Usually added by the middlewares
 */
export async function compileOapi<TRequest extends Empty>({
  api,
  paths,
  security,
}: OapiConfig<TRequest>): Promise<ResolvedSchema<ResolvedOpenAPIObject>> {
  const compiledApi = await compile(api);
  const apiSchema = toSchemaObject(compiledApi);

  const { value: oapi } = await ensureValid<ResolvedOpenAPIObject>({
    schema: openapiV3 as Schema,
    value: apiSchema,
    name: 'OpenApi',
  });

  const schema = {
    required: ['paths', ...(oapi.components?.securitySchemes ? ['security'] : [])],
    properties: {
      paths: {
        required: Object.keys(oapi.paths),
        properties: Object.entries(oapi.paths).reduce((all, [path, pathParameters]) => {
          const { parameters, summary, description, ...methods } = pathParameters;
          return { ...all, [path]: { required: Object.keys(methods) } };
        }, {}),
      },
      ...(oapi.components?.securitySchemes
        ? { security: { required: Object.keys(oapi.components.securitySchemes) } }
        : {}),
    },
  };

  await ensureValid({
    schema: compileInContext(schema, compiledApi),
    name: 'createOapiOptions',
    value: { paths, security },
  });

  return compileInContext(oapi, compiledApi);
}
