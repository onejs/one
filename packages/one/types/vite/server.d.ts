import { AsyncLocalStorage } from 'node:async_hooks';
type ALSInstance = AsyncLocalStorage<unknown>;
export declare const requestAsyncLocalStore: ALSInstance | null | undefined;
export declare const asyncHeadersCache: WeakMap<any, Headers>;
export declare function runWithAsyncLocalContext<A>(cb: (id: Object) => Promise<A>): Promise<A>;
export declare function setResponseHeaders(cb: (headers: Headers) => void): Promise<void>;
export declare function mergeHeaders(onto: Headers, from: Headers): void;
export {};
//# sourceMappingURL=server.d.ts.map