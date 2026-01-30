/**
 * Simple concurrency limiter for parallel async operations.
 * Returns a function that wraps promises to limit concurrent execution.
 *
 * @param concurrency - Maximum number of concurrent operations
 * @returns A function that takes a promise-returning function and queues it
 *
 * @example
 * const limit = pLimit(4)
 * const results = await Promise.all(
 *   urls.map(url => limit(() => fetch(url)))
 * )
 */
export declare function pLimit(concurrency: number): <T>(fn: () => Promise<T>) => Promise<T>;
//# sourceMappingURL=pLimit.d.ts.map