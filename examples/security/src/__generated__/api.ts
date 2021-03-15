import { OapiContext, OapiConfig, Empty, HttpListener, openApi, OapiSecurityResolver, OapiAuthInfo, ResponseOapi } from "@ovotech/laminar";

export const openApiTyped = <R extends Empty = Empty, TAuthInfo extends OapiAuthInfo = OapiAuthInfo>(config: Config<R, TAuthInfo>): Promise<HttpListener<R>> => openApi(config);

export interface UserResponse {
    id?: string;
    name?: string;
    [key: string]: unknown;
}

export type ResponseUserIdGet = ResponseOapi<UserResponse, 200, "application/json">;

export interface RequestUserIdGet<TAuthInfo> extends OapiContext {
    path: {
        id: string;
    };
    authInfo: TAuthInfo;
}

export type PathUserIdGet<R extends Empty = Empty, TAuthInfo extends OapiAuthInfo = OapiAuthInfo> = (req: RequestUserIdGet<TAuthInfo> & R) => Promise<ResponseUserIdGet>;

export interface Config<R extends Empty = Empty, TAuthInfo extends OapiAuthInfo = OapiAuthInfo> extends OapiConfig<R> {
    paths: {
        "/user/{id}": {
            get: PathUserIdGet<R, TAuthInfo>;
        };
    };
    security: {
        JWT: OapiSecurityResolver<R, TAuthInfo>;
    };
}
