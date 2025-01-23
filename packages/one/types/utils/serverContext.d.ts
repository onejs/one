import type { One } from '../vite/types';
export type ServerContext = {
    css?: string[];
    postRenderData?: any;
    loaderData?: any;
    loaderProps?: any;
    mode?: 'spa' | 'ssg' | 'ssr';
};
export type MaybeServerContext = null | ServerContext;
export declare const SERVER_CONTEXT_POST_RENDER_STRING = "_one_post_render_data_";
export declare function setServerContext(data: ServerContext): void;
export declare function getServerContext(): ServerContext | undefined;
export declare const ProviderServerAsyncLocalIDContext: import("react").Provider<ServerContext | null>;
export declare function ServerContextScript(): import("react/jsx-runtime").JSX.Element;
/**
 * For passing data from the server to the client. Can only be called on the server.
 * You can type it by overriding `One.ClientData` type using declare module 'one'.
 *
 * On the client, you can access the data with `getServerData`.
 */
export declare function setServerData<Key extends keyof One.ClientData>(key: Key, value: One.ClientData[Key]): void;
/**
 * For getting data set by setServerData on the server.
 */
export declare function getServerData(key: keyof One.ClientData): any;
//# sourceMappingURL=serverContext.d.ts.map