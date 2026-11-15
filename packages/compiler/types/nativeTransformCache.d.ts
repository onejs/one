type Result = {
    code: string;
    map?: any;
} | undefined;
export declare function cachedNativeTransform(stage: string, filename: string, code: string, options: unknown, transform: () => Promise<Result>): Promise<Result>;
export {};
//# sourceMappingURL=nativeTransformCache.d.ts.map