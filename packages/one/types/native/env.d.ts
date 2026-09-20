export declare const ONE_PUBLIC_PREFIX = "ONE_PUBLIC_";
export declare const ONE_PLATFORM_ENV = "ONE_PLATFORM";
export type OnePlatformKey = 'ios' | 'android' | 'web';
export declare function assertNoExpoPublicEnv(env: Record<string, string | undefined>): void;
export declare function pickOnePublicEnv(env: Record<string, string | undefined>): Record<string, string>;
//# sourceMappingURL=env.d.ts.map