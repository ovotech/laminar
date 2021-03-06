import { AppRequest, Response, Empty } from '../..';
import { SecurityRequirementObject, SecuritySchemeObject } from 'openapi3-ts';
import { OapiAuthInfo, OapiSecurity, RequestOapi, Security, SecurityOk } from './types';

/**
 * Return a {@link SecurityOk} object, indicating a successfull security check. Should be returned by a {@link OapiSecurityResolver}
 */
export function securityOk<TOapiAuthInfo extends OapiAuthInfo>(authInfo: TOapiAuthInfo): Security<TOapiAuthInfo> {
  return { authInfo };
}

/**
 * Check if a response from {@link OapiSecurityResolver} is a {@link SecurityOk} object, indicating a successfull security check
 */
export function isSecurityOk(item: Security): item is SecurityOk {
  return 'authInfo' in item;
}

/**
 * Check if a response from {@link OapiSecurityResolver} is a {@link Response} object, indicating a failed security check
 */
export function isSecurityResponse(item: Security): item is Response {
  return 'status' in item;
}

/**
 * Using the OpenApi schema requiremnts over the current request.
 */
export async function validateSecurity<
  TRequest extends Empty = Empty,
  TOapiAuthInfo extends OapiAuthInfo = OapiAuthInfo
>(
  req: TRequest & AppRequest & RequestOapi,
  requirements?: SecurityRequirementObject[],
  schemes?: { [securityScheme: string]: SecuritySchemeObject },
  security?: OapiSecurity<TRequest, TOapiAuthInfo>,
): Promise<Security<TOapiAuthInfo> | undefined> {
  if (!requirements?.length || !security || !schemes) {
    return undefined;
  }

  const resultGroups = await Promise.all(
    requirements.map((group) =>
      Promise.all(
        Object.entries(group).map(([name, scopes]) =>
          security[name]({ ...req, securityScheme: schemes[name], scopes }),
        ),
      ),
    ),
  );

  const combinedResultGroups = resultGroups.map((group) =>
    group.every(isSecurityOk) ? group[0] : group.filter(isSecurityResponse)[0],
  );
  return combinedResultGroups.find(isSecurityOk) ?? combinedResultGroups.filter(isSecurityResponse)[0];
}
