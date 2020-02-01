import {
  document,
  Document,
  mapWithContext,
  Type,
  withIdentifier,
  withImports,
} from '@ovotech/ts-compose';
import {
  OpenAPIObject,
  ParameterObject,
  PathItemObject,
  ReferenceObject,
  RequestBodyObject,
  ResponseObject,
  ResponsesObject,
} from 'openapi3-ts';
import * as ts from 'typescript';
import { convertSchema } from './convert-schema';
import {
  AstContext,
  isSchemaObject,
  isResponseObject,
  getReferencedObject,
  isRequestBodyObject,
  isParameterObject,
} from './traverse';

interface AstParameters {
  in: {
    query?: ts.TypeElement[];
    headers?: ts.TypeElement[];
    path?: ts.TypeElement[];
    cookies?: ts.TypeElement[];
  };
  context: AstContext;
}

const title = (str: string): string => str.replace(/^./, first => first.toUpperCase());
const documentation = (summary?: string, description?: string): string | undefined =>
  summary || description
    ? [summary, description].filter(item => item !== undefined).join('\n')
    : undefined;
const cleanIdentifierName = (str: string): string => str.replace(/[^0-9a-zA-Z_$]+/g, '');

const pathToIdentifier = (path: string): string =>
  'T' +
  path
    .split('/')
    .map(cleanIdentifierName)
    .map(title)
    .join('');

const toParamLocation = (
  location: 'header' | 'cookie' | 'path' | 'query',
): 'headers' | 'cookies' | 'path' | 'query' => {
  switch (location) {
    case 'header':
      return 'headers';
    case 'cookie':
      return 'cookies';
    default:
      return location;
  }
};

const toParamName = (location: 'header' | 'cookie' | 'path' | 'query', name: string): string =>
  location === 'header' ? name.toLowerCase() : name;

const convertParameters = (
  context: AstContext,
  parameters: (ParameterObject | ReferenceObject)[],
): Document<ts.TypeLiteralNode, AstContext> => {
  const astParams = parameters.reduce<AstParameters>(
    (node, paramOrRef) => {
      const param = getReferencedObject(paramOrRef, isParameterObject, node.context);
      const paramNode = param.schema
        ? convertSchema(node.context, param.schema)
        : document(node.context, Type.Any);
      const params = node.in[toParamLocation(param.in)] || [];
      return {
        context: paramNode.context,
        in: {
          ...node.in,
          [toParamLocation(param.in)]: [
            ...params,
            Type.Prop({
              name: toParamName(param.in, param.name),
              jsDoc: documentation(param.description),
              type: paramNode.type,
              isOptional: !param.required,
            }),
          ],
        },
      };
    },
    { in: {}, context },
  );

  return {
    type: Type.TypeLiteral({
      props: Object.entries(astParams.in).map(([name, items]) =>
        Type.Prop({ name, type: Type.TypeLiteral({ props: items }) }),
      ),
    }),

    context: astParams.context,
  };
};

const convertResponse = (
  context: AstContext,
  key: string,
  response: ResponseObject,
): Document<ts.UnionTypeNode, AstContext> => {
  const schema =
    response.content &&
    ((response.content['application/json'] && response.content['application/json'].schema) ||
      (response.content['*/*'] && response.content['*/*'].schema));

  if (schema) {
    const node = convertSchema(context, schema);
    const nodeType =
      key === '200' || key === 'default'
        ? Type.Union([
            node.type,
            Type.Ref('LaminarResponse', [node.type]),
            Type.Ref('Promise', [node.type]),
            Type.Ref('Promise', [Type.Ref('LaminarResponse', [node.type])]),
          ])
        : Type.Union([
            Type.Ref('LaminarResponse', [node.type]),
            Type.Ref('Promise', [Type.Ref('LaminarResponse', [node.type])]),
          ]);

    return document(withImports(node.context, '@ovotech/laminar', ['LaminarResponse']), nodeType);
  } else {
    const nodeType = Type.Union([
      Type.Ref('LaminarResponse'),
      Type.Ref('Promise', [Type.Ref('LaminarResponse')]),
    ]);

    return document(withImports(context, '@ovotech/laminar', ['LaminarResponse']), nodeType);
  }
};

const convertResponses = (
  context: AstContext,
  name: string,
  responses: ResponsesObject,
): Document<ts.TypeReferenceNode, AstContext> => {
  const responseEntries = Object.entries<ResponseObject | ReferenceObject>(responses);

  const params = responseEntries.reduce<Document<ts.UnionTypeNode, AstContext>>(
    (responseNode, [key, responseOrRef]) => {
      const response = getReferencedObject(responseOrRef, isResponseObject, responseNode.context);
      const node = convertResponse(responseNode.context, key, response);
      return document(node.context, Type.Union(responseNode.type.types.concat([node.type])));
    },
    document(context, Type.Union([])),
  );

  return params.type.types.length
    ? document(
        withIdentifier(params.context, Type.Alias({ name, type: params.type, isExport: true })),
        Type.Ref(name),
      )
    : document(
        withImports(context, '@ovotech/laminar', ['ResolverResponse']),
        Type.Ref('ResolverResponse'),
      );
};

const convertRequestBody = (
  context: AstContext,
  requestBodyOrRef: RequestBodyObject | ReferenceObject,
): Document<ts.TypeLiteralNode, AstContext> => {
  const requestBody = getReferencedObject(requestBodyOrRef, isRequestBodyObject, context);
  const schema = requestBody.content['application/json']
    ? requestBody.content['application/json'].schema
    : {};
  const node = schema ? convertSchema(context, schema) : document(context, Type.Any);
  return document(
    node.context,
    Type.TypeLiteral({
      props: [Type.Prop({ name: 'body', type: node.type, isOptional: !requestBody.required })],
    }),
  );
};

export const convertOapi = (
  context: AstContext,
  api: OpenAPIObject,
): Document<ts.InterfaceDeclaration, AstContext> => {
  const paths = mapWithContext(
    context,
    Object.entries<PathItemObject>(api.paths),
    (pathContext, [path, pathApiOrRef]) => {
      const { parameters, description, summary, ...methodsApiOrRef } = pathApiOrRef;
      const pathApi = getReferencedObject(methodsApiOrRef, isSchemaObject, context);

      const methods = mapWithContext(
        pathContext,
        Object.entries(pathApi),
        (methodContext, [method, operation]) => {
          const astParams =
            operation.parameters || parameters
              ? convertParameters(methodContext, [
                  ...(parameters ?? []),
                  ...(operation.parameters ?? []),
                ])
              : document(methodContext, Type.TypeLiteral());

          const astRequestBody = operation.requestBody
            ? convertRequestBody(astParams.context, operation.requestBody)
            : document(methodContext, Type.TypeLiteral());

          const identifier = pathToIdentifier(path) + title(method);
          const contextIdentifier = identifier + 'Context';
          const responseIdentifier = identifier + 'Response';
          const doc = documentation(
            operation.summary || summary,
            operation.description || description,
          );
          const contextInterface = Type.Interface({
            name: contextIdentifier,
            isExport: true,
            jsDoc: doc,
            ext: [{ name: 'Context' }, { name: 'OapiContext' }],
            props: astParams.type.members.concat(astRequestBody.type.members),
          });

          const responseAst = convertResponses(
            astRequestBody.context,
            responseIdentifier,
            operation.responses,
          );

          const methodCall = Type.Arrow(
            [
              Type.Param({
                name: 'context',
                type: Type.Intersection([Type.Ref(contextIdentifier), Type.Ref('C')]),
              }),
            ],
            responseAst.type,
          );

          const methodSignature = Type.Prop({
            name: method,
            type: methodCall,
            jsDoc: operation.description,
          });

          return document(withIdentifier(responseAst.context, contextInterface), methodSignature);
        },
      );

      return document(
        methods.context,
        Type.Prop({
          name: Type.LiteralString(path),
          type: Type.TypeLiteral({ props: methods.items }),
        }),
      );
    },
  );

  return document(
    withImports(
      withImports(paths.context, '@ovotech/laminar-oapi', [
        'OapiContext',
        'OapiConfig',
        ...(api.components && api.components.securitySchemes ? ['OapiSecurityResolver'] : []),
      ]),
      '@ovotech/laminar',
      ['Context'],
    ),
    Type.Interface({
      name: 'Config',
      isExport: true,
      ext: [{ name: 'OapiConfig', types: [Type.Ref('C')] }],
      typeArgs: [
        Type.TypeArg({
          name: 'C',
          ext: Type.TypeLiteral(),
          defaultType: Type.TypeLiteral(),
        }),
      ],
      props: [
        Type.Prop({ name: 'paths', type: Type.TypeLiteral({ props: paths.items }) }),
        ...(api.components && api.components.securitySchemes
          ? [
              Type.Prop({
                name: 'security',
                type: Type.TypeLiteral({
                  props: Object.keys(api.components.securitySchemes).map(scheme =>
                    Type.Prop({
                      name: scheme,
                      type: Type.Ref('OapiSecurityResolver', [Type.Ref('C')]),
                    }),
                  ),
                }),
              }),
            ]
          : []),
      ],
    }),
  );
};
