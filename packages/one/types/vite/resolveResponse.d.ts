export declare function resolveResponse(getResponse: () => Promise<Response>): Promise<any>;
/**
 * enter ALS context once for the entire request handler.
 */
export declare function withRequestContext<T>(fn: () => Promise<T>): Promise<T>;
export declare function resolveAPIEndpoint(runEndpoint: () => Promise<any>, request: Request, params: Record<string, string>, env?: unknown, executionCtx?: unknown): Promise<any>;
//# sourceMappingURL=resolveResponse.d.ts.map