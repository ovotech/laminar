import { HttpMiddleware, Empty, OapiSecurityResolver } from '@ovotech/laminar';
import { authMiddleware, jwtSecurityResolver, toMissing } from './jwt';
import { ScopeError, JWTData, JWTVerify, RequestAuthInfo } from './types';

export interface JWTDataKeycloak extends JWTData {
  resource_access?: { [key: string]: { roles: string[] } };
}

export interface KeycloakOptions extends JWTVerify {
  service: string;
}

export const keycloakScopeError = (service: string): ScopeError<JWTDataKeycloak> => (data, scopes = []) => {
  const missingScopes = toMissing(data.resource_access?.[service]?.roles ?? [], scopes);
  return missingScopes.length
    ? `User does not have required roles: [${missingScopes.join(', ')}] for ${service}`
    : undefined;
};

export const keycloakAuthMiddleware = <TUser extends JWTDataKeycloak = JWTDataKeycloak>(
  options: KeycloakOptions,
): ((scopes?: string[]) => HttpMiddleware<RequestAuthInfo<TUser>>) =>
  authMiddleware({ ...options, scopeError: keycloakScopeError(options.service) });

export const keycloakJwtSecurityResolver = <TUser extends JWTDataKeycloak = JWTDataKeycloak>(
  options: KeycloakOptions,
): OapiSecurityResolver<Empty, TUser> =>
  jwtSecurityResolver({ ...options, scopeError: keycloakScopeError(options.service) });
