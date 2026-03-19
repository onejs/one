export declare function resolveResponse(getResponse: () => Promise<Response>): Promise<any>;
/**
 * lightweight version that assumes ALS context is already active.
 * skips store.run() overhead and just handles response + error wrapping.
 * use inside a `withRequestContext()` scope.
 */
export declare function resolveResponseLite(getResponse: () => Promise<Response>): Promise<Response>;
/**
 * enter ALS context once for the entire request handler.
 * downstream code can use resolveResponseLite to skip redundant store.run().
 */
export declare function withRequestContext<T>(fn: () => Promise<T>): Promise<T>;
export declare function resolveAPIEndpoint(runEndpoint: () => Promise<any>, request: Request, params: Record<string, string>): Promise<any>;
//# sourceMappingURL=resolveResponse.d.ts.map