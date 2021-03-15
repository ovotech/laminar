import { OapiContext, OapiConfig, Empty, HttpListener, openApi, OapiSecurityResolver, OapiAuthInfo, ResponseOapi } from "@ovotech/laminar";

export const openApiTyped = <R extends Empty = Empty, TAuthInfo extends OapiAuthInfo = OapiAuthInfo>(config: Config<R, TAuthInfo>): Promise<HttpListener<R>> => openApi(config);

export type Pet = NewPet & {
    id: number;
    [key: string]: unknown;
};

export interface NewPet {
    name: string;
    tag?: string;
    [key: string]: unknown;
}

export interface Error {
    code: number;
    message: string;
}

export type ResponsePetsGet = ResponseOapi<Pet[], 200, "application/json"> | ResponseOapi<Error, number, "application/json">;

/**
 * Returns all pets from the system that the user has access to
 * Nam sed condimentum est. Maecenas tempor sagittis sapien, nec rhoncus sem sagittis sit amet. Aenean at gravida augue, ac iaculis sem. Curabitur odio lorem, ornare eget elementum nec, cursus id lectus. Duis mi turpis, pulvinar ac eros ac, tincidunt varius justo. In hac habitasse platea dictumst. Integer at adipiscing ante, a sagittis ligula. Aenean pharetra tempor ante molestie imperdiet. Vivamus id aliquam diam. Cras quis velit non tortor eleifend sagittis. Praesent at enim pharetra urna volutpat venenatis eget eget mauris. In eleifend fermentum facilisis. Praesent enim enim, gravida ac sodales sed, placerat id erat. Suspendisse lacus dolor, consectetur non augue vel, vehicula interdum libero. Morbi euismod sagittis libero sed lacinia.
 *
 * Sed tempus felis lobortis leo pulvinar rutrum. Nam mattis velit nisl, eu condimentum ligula luctus nec. Phasellus semper velit eget aliquet faucibus. In a mattis elit. Phasellus vel urna viverra, condimentum lorem id, rhoncus nibh. Ut pellentesque posuere elementum. Sed a varius odio. Morbi rhoncus ligula libero, vel eleifend nunc tristique vitae. Fusce et sem dui. Aenean nec scelerisque tortor. Fusce malesuada accumsan magna vel tempus. Quisque mollis felis eu dolor tristique, sit amet auctor felis gravida. Sed libero lorem, molestie sed nisl in, accumsan tempor nisi. Fusce sollicitudin massa ut lacinia mattis. Sed vel eleifend lorem. Pellentesque vitae felis pretium, pulvinar elit eu, euismod sapien.
 *
 */
export interface RequestPetsGet<TAuthInfo> extends OapiContext {
    query: {
        /**
         * tags to filter by
         */
        tags?: string[];
        /**
         * maximum number of results to return
         */
        limit?: number;
    };
    authInfo: TAuthInfo;
}

/**
 * Returns all pets from the system that the user has access to
 * Nam sed condimentum est. Maecenas tempor sagittis sapien, nec rhoncus sem sagittis sit amet. Aenean at gravida augue, ac iaculis sem. Curabitur odio lorem, ornare eget elementum nec, cursus id lectus. Duis mi turpis, pulvinar ac eros ac, tincidunt varius justo. In hac habitasse platea dictumst. Integer at adipiscing ante, a sagittis ligula. Aenean pharetra tempor ante molestie imperdiet. Vivamus id aliquam diam. Cras quis velit non tortor eleifend sagittis. Praesent at enim pharetra urna volutpat venenatis eget eget mauris. In eleifend fermentum facilisis. Praesent enim enim, gravida ac sodales sed, placerat id erat. Suspendisse lacus dolor, consectetur non augue vel, vehicula interdum libero. Morbi euismod sagittis libero sed lacinia.
 *
 * Sed tempus felis lobortis leo pulvinar rutrum. Nam mattis velit nisl, eu condimentum ligula luctus nec. Phasellus semper velit eget aliquet faucibus. In a mattis elit. Phasellus vel urna viverra, condimentum lorem id, rhoncus nibh. Ut pellentesque posuere elementum. Sed a varius odio. Morbi rhoncus ligula libero, vel eleifend nunc tristique vitae. Fusce et sem dui. Aenean nec scelerisque tortor. Fusce malesuada accumsan magna vel tempus. Quisque mollis felis eu dolor tristique, sit amet auctor felis gravida. Sed libero lorem, molestie sed nisl in, accumsan tempor nisi. Fusce sollicitudin massa ut lacinia mattis. Sed vel eleifend lorem. Pellentesque vitae felis pretium, pulvinar elit eu, euismod sapien.
 *
 */
export type PathPetsGet<R extends Empty = Empty, TAuthInfo extends OapiAuthInfo = OapiAuthInfo> = (req: RequestPetsGet<TAuthInfo> & R) => Promise<ResponsePetsGet>;

export interface PetCreated {
    pet?: NewPet;
    user?: string;
    [key: string]: unknown;
}

export type ResponsePetsPost = ResponseOapi<PetCreated, 200, "application/json"> | ResponseOapi<Error, number, "application/json">;

/**
 * Creates a new pet in the store.  Duplicates are allowed
 */
export interface RequestPetsPost<TAuthInfo> extends OapiContext {
    headers: {
        /**
         * a trace token to trace posts
         */
        "x-trace-token": string;
    };
    body: NewPet;
    authInfo: TAuthInfo;
}

/**
 * Creates a new pet in the store.  Duplicates are allowed
 */
export type PathPetsPost<R extends Empty = Empty, TAuthInfo extends OapiAuthInfo = OapiAuthInfo> = (req: RequestPetsPost<TAuthInfo> & R) => Promise<ResponsePetsPost>;

export type ResponsePetsIdGet = ResponseOapi<Pet, 200, "application/json"> | ResponseOapi<Error, number, "application/json">;

/**
 * Returns a user based on a single ID, if the user does not have access to the pet
 */
export interface RequestPetsIdGet<TAuthInfo> extends OapiContext {
    path: {
        /**
         * ID of pet to fetch
         */
        id: string;
    };
    authInfo: TAuthInfo;
}

/**
 * Returns a user based on a single ID, if the user does not have access to the pet
 */
export type PathPetsIdGet<R extends Empty = Empty, TAuthInfo extends OapiAuthInfo = OapiAuthInfo> = (req: RequestPetsIdGet<TAuthInfo> & R) => Promise<ResponsePetsIdGet>;

export type ResponsePetsIdDelete = ResponseOapi<unknown, 204, string> | ResponseOapi<Error, number, "application/json">;

/**
 * deletes a single pet based on the ID supplied
 */
export interface RequestPetsIdDelete<TAuthInfo> extends OapiContext {
    path: {
        /**
         * ID of pet to delete
         */
        id: string;
    };
    authInfo: TAuthInfo;
}

/**
 * deletes a single pet based on the ID supplied
 */
export type PathPetsIdDelete<R extends Empty = Empty, TAuthInfo extends OapiAuthInfo = OapiAuthInfo> = (req: RequestPetsIdDelete<TAuthInfo> & R) => Promise<ResponsePetsIdDelete>;

export interface Config<R extends Empty = Empty, TAuthInfo extends OapiAuthInfo = OapiAuthInfo> extends OapiConfig<R> {
    paths: {
        "/pets": {
            /**
             * Returns all pets from the system that the user has access to
             * Nam sed condimentum est. Maecenas tempor sagittis sapien, nec rhoncus sem sagittis sit amet. Aenean at gravida augue, ac iaculis sem. Curabitur odio lorem, ornare eget elementum nec, cursus id lectus. Duis mi turpis, pulvinar ac eros ac, tincidunt varius justo. In hac habitasse platea dictumst. Integer at adipiscing ante, a sagittis ligula. Aenean pharetra tempor ante molestie imperdiet. Vivamus id aliquam diam. Cras quis velit non tortor eleifend sagittis. Praesent at enim pharetra urna volutpat venenatis eget eget mauris. In eleifend fermentum facilisis. Praesent enim enim, gravida ac sodales sed, placerat id erat. Suspendisse lacus dolor, consectetur non augue vel, vehicula interdum libero. Morbi euismod sagittis libero sed lacinia.
             *
             * Sed tempus felis lobortis leo pulvinar rutrum. Nam mattis velit nisl, eu condimentum ligula luctus nec. Phasellus semper velit eget aliquet faucibus. In a mattis elit. Phasellus vel urna viverra, condimentum lorem id, rhoncus nibh. Ut pellentesque posuere elementum. Sed a varius odio. Morbi rhoncus ligula libero, vel eleifend nunc tristique vitae. Fusce et sem dui. Aenean nec scelerisque tortor. Fusce malesuada accumsan magna vel tempus. Quisque mollis felis eu dolor tristique, sit amet auctor felis gravida. Sed libero lorem, molestie sed nisl in, accumsan tempor nisi. Fusce sollicitudin massa ut lacinia mattis. Sed vel eleifend lorem. Pellentesque vitae felis pretium, pulvinar elit eu, euismod sapien.
             *
             */
            get: PathPetsGet<R, TAuthInfo>;
            /**
             * Creates a new pet in the store.  Duplicates are allowed
             */
            post: PathPetsPost<R, TAuthInfo>;
        };
        "/pets/{id}": {
            /**
             * Returns a user based on a single ID, if the user does not have access to the pet
             */
            get: PathPetsIdGet<R, TAuthInfo>;
            /**
             * deletes a single pet based on the ID supplied
             */
            delete: PathPetsIdDelete<R, TAuthInfo>;
        };
    };
    security: {
        BasicAuth: OapiSecurityResolver<R, TAuthInfo>;
        BearerAuth: OapiSecurityResolver<R, TAuthInfo>;
        ApiKeyAuth: OapiSecurityResolver<R, TAuthInfo>;
    };
}
