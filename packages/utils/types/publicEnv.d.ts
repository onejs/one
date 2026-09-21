export declare const ONE_PUBLIC_PREFIX = "ONE_PUBLIC_";
export declare const EXPO_PUBLIC_PREFIX = "EXPO_PUBLIC_";
/**
 * Expose One public values under Expo's established same-suffix names for
 * package compatibility. Explicit Expo values win; Expo input never creates a
 * One-owned name.
 */
export declare function withExpoPublicEnvAliases<T>(env: Record<string, T>): Record<string, T>;
//# sourceMappingURL=publicEnv.d.ts.map