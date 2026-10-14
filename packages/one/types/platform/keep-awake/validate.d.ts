export declare function assertKeepAwakeEnabled(value: unknown): asserts value is boolean;
export declare const keepAwakeDefaultTag = "ExpoKeepAwakeDefaultTag";
export declare function assertKeepAwakeTag(value: unknown, owner: 'activate' | 'deactivate' | 'useKeepAwake'): asserts value is string | undefined;
export declare function normalizeKeepAwakeTag(value: string | undefined): string;
//# sourceMappingURL=validate.d.ts.map