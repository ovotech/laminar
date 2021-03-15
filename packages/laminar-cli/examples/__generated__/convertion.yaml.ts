import { OapiContext, OapiConfig, Empty, HttpListener, openApi, ResponseOapi } from "@ovotech/laminar";

export const openApiTyped = <R extends Empty = Empty>(config: Config<R>): Promise<HttpListener<R>> => openApi(config);

export interface User {
    email: string;
    title?: string;
    createdAt?: string;
    [key: string]: unknown;
}

export interface NewUser {
    result: string;
    user: User;
    [key: string]: unknown;
}

export type ResponseUserPost = ResponseOapi<NewUser, 200, "application/json">;

export interface RequestUserPost extends OapiContext {
    body: User;
}

export type PathUserPost<R extends Empty = Empty> = (req: RequestUserPost & R) => Promise<ResponseUserPost>;

export type ResponseUserGet = ResponseOapi<User, 200, "application/json">;

export type PathUserGet<R extends Empty = Empty> = (req: OapiContext & R) => Promise<ResponseUserGet>;

export interface Config<R extends Empty = Empty> extends OapiConfig<R> {
    paths: {
        "/user": {
            post: PathUserPost<R>;
            get: PathUserGet<R>;
        };
    };
}
