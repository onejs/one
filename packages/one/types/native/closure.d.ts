export declare const FORBIDDEN_EXPO_PATTERN_SOURCES: readonly ['^expo$', '^expo-.*', '^@expo/.*', '^expo-modules-core$', '^@expo/config-plugins$', '^babel-preset-expo$'];
export declare function isForbiddenExpoSpecifier(specifier: string): boolean;
export declare function findForbiddenDependencies(resolved: Record<string, string> | string[]): string[];
export declare function auditUnpackedManifest(manifest: {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
}): string[];
export type ResolutionEvent = {
    specifier: string;
    importer?: string;
};
export declare function createResolutionRecorder(): {
    record(specifier: string, importer?: string): void;
    events(): ResolutionEvent[];
};
//# sourceMappingURL=closure.d.ts.map