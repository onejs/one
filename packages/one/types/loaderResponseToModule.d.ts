/**
 * Redirects, auth errors and rejected search params answer a loader request as a
 * js module carrying a marker, so the client reads the outcome instead of a failed
 * module parse. Other responses pass through.
 */
export declare function loaderResponseToModule(response: Response, url: URL, isNativeRequest?: boolean): Response;
//# sourceMappingURL=loaderResponseToModule.d.ts.map