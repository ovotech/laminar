import { OapiContext, OapiConfig, Empty, HttpListener, openApi, ResponseOapi } from "@ovotech/laminar";

export const openApiTyped = <R extends Empty = Empty>(config: Config<R>): Promise<HttpListener<R>> => openApi(config);

export interface User {
    email: string;
    scopes?: string[];
}

export interface Test {
    text: string;
    user?: User;
    [key: string]: unknown;
}

export type ResponseTestPost = ResponseOapi<Test, 200, "application/json">;

export interface RequestTestPost extends OapiContext {
    body: User;
}

export type PathTestPost<R extends Empty = Empty> = (req: RequestTestPost & R) => Promise<ResponseTestPost>;

export type ResponseTestGet = ResponseOapi<Test, 200, "application/json">;

export type PathTestGet<R extends Empty = Empty> = (req: OapiContext & R) => Promise<ResponseTestGet>;

export interface Config<R extends Empty = Empty> extends OapiConfig<R> {
    paths: {
        "/test": {
            post: PathTestPost<R>;
            get: PathTestGet<R>;
        };
    };
}
