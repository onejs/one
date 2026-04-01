/** Resolve to native filesystem path — for fs operations (readFile, writeFile, join). */
export declare const toAbsolute: (p: string) => string;
/** Resolve to file:// URL — for dynamic import() which requires URLs on Windows. */
export declare const toAbsoluteUrl: (p: string) => string;
//# sourceMappingURL=toAbsolute.d.ts.map