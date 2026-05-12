/**
 * On Windows, micromatch.makeRe() produces regex patterns with `[\\/]` or `[^\\/]`
 * instead of `\/` and `[^/]`. Normalize them so the startsWith check works.
 */
export declare function normalizeReSource(source: string): string;
//# sourceMappingURL=normalizeReSource.d.ts.map