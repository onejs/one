/// <reference types="node" />
import { AsyncLocalStorage } from 'node:async_hooks';
export declare const requestAsyncLocalStore: AsyncLocalStorage<unknown>;
export declare const asyncHeadersCache: WeakMap<any, Headers>;
export declare function setCurrentRequestHeaders(cb: (headers: Headers) => void): Promise<void>;
export declare function mergeHeaders(onto: Headers, from: Headers): void;
//# sourceMappingURL=headers.d.ts.map