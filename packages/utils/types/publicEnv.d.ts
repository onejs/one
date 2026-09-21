export declare const ONE_PUBLIC_PREFIX = "ONE_PUBLIC_";
export declare const EXPO_PUBLIC_PREFIX = "EXPO_PUBLIC_";
/**
 * Keep One and Expo's public env names interchangeable without changing an
 * explicitly supplied value. Only the two public prefixes are aliased.
 */
export declare function withPublicEnvAliases<T>(env: Record<string, T>): Record<string, T>;
export declare function getPublicEnvCounterpart(key: string): string | undefined;
//# sourceMappingURL=publicEnv.d.ts.map