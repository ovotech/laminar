import { OapiContext, OapiConfig, Empty, HttpListener, openApi, ResponseOapi } from "@ovotech/laminar";

export const openApiTyped = <R extends Empty = Empty>(config: Config<R>): Promise<HttpListener<R>> => openApi(config);

export interface UserResponse {
    id?: string;
    name?: string;
    [key: string]: unknown;
}

export type ResponseUserIdGet = ResponseOapi<UserResponse, 200, "application/json">;

export interface RequestUserIdGet extends OapiContext {
    path: {
        id: string;
    };
}

export type PathUserIdGet<R extends Empty = Empty> = (req: RequestUserIdGet & R) => Promise<ResponseUserIdGet>;

export interface Config<R extends Empty = Empty> extends OapiConfig<R> {
    paths: {
        "/user/{id}": {
            get: PathUserIdGet<R>;
        };
    };
}
