export type Platform = 'ios' | 'android' | 'web';
export type ViteEnvironment = 'client' | 'ssr' | 'ios' | 'android';
export type PlatformEnv = {
    VITE_ENVIRONMENT: ViteEnvironment;
    VITE_NATIVE: '' | '1';
    EXPO_OS: 'web' | 'ios' | 'android';
    TAMAGUI_ENVIRONMENT: ViteEnvironment;
};
export declare function getPlatformEnv(environment: ViteEnvironment): PlatformEnv;
export declare function metroPlatformToViteEnvironment(platform: Platform | string | null | undefined): ViteEnvironment;
/**
 * Format platform env for Vite's define config.
 * Returns both process.env.* and import.meta.env.* definitions.
 * VITE_NATIVE is "1" or "" (truthy/falsy string) to avoid polluting process.env types.
 */
export declare function getPlatformEnvDefine(environment: ViteEnvironment): Record<string, string>;
//# sourceMappingURL=platformEnv.d.ts.map