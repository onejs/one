/**
 * Contents of this file are partial copies from:
 * https://github.com/vitejs/vite/blob/v6.0.11/packages/vite/src/node/utils.ts
 *
 * We only copy what we need which we can't import directly from vite, with no modifications except of making TypeScript happy.
 */
type MergeWithDefaultsResult<D, V> = any;
export declare function isObject(value: unknown): value is Record<string, any>;
export declare function arraify<T>(target: T | T[]): T[];
type AsyncFlatten<T extends unknown[]> = T extends (infer U)[] ? Exclude<Awaited<U>, U[]>[] : never;
export declare function asyncFlatten<T extends unknown[]>(arr: T): Promise<AsyncFlatten<T>>;
export declare function displayTime(time: number): string;
export declare function cleanUrl(url: string): string;
/**
 * Like `encodeURIPath`, but only replacing `%` as `%25`. This is useful for environments
 * that can handle un-encoded URIs, where `%` is the only ambiguous character.
 */
export declare function partialEncodeURIPath(uri: string): string;
export declare function joinUrlSegments(a: string, b: string): string;
type DeepWritable<T> = T extends ReadonlyArray<unknown> ? {
    -readonly [P in keyof T]: DeepWritable<T[P]>;
} : T extends RegExp ? RegExp : T[keyof T] extends Function ? T : {
    -readonly [P in keyof T]: DeepWritable<T[P]>;
};
export declare function mergeWithDefaults<D extends Record<string, any>, V extends Record<string, any>>(defaults: D, values: V): MergeWithDefaultsResult<DeepWritable<D>, V>;
export {};
//# sourceMappingURL=utils.d.ts.map