import { AsyncLocalStorage } from 'node:async_hooks';
import type { One } from './types';
type ALSInstance = AsyncLocalStorage<unknown>;
export declare const requestAsyncLocalStore: ALSInstance | null | undefined;
export declare const asyncHeadersCache: WeakMap<any, Headers>;
export declare function runWithAsyncLocalContext<A>(cb: (id: Object) => Promise<A>): Promise<A>;
export declare function setResponseHeaders(cb: (headers: Headers) => void): Promise<void>;
export declare function mergeHeaders(onto: Headers, from: Headers): void;
export declare function ensureAsyncLocalID(): Object;
export type MaybeServerContext = null | One.ServerContext;
export declare function setServerContext(data: One.ServerContext): void;
export declare function getServerContext(): MaybeServerContext | undefined;
export declare function useServerContext(): MaybeServerContext | undefined;
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
export {};
//# sourceMappingURL=one-server-only.d.ts.map