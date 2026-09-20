export type OnePlatformName = 'web' | 'ios' | 'android' | 'rnx';
export type PlatformBindingEntry = {
    declarationId: string;
    qualifiedName: string;
};
export type PlatformBindingRegistry = Record<string, PlatformBindingEntry>;
export interface OneNativePlatform {
    name: OnePlatformName;
    operations: Record<string, (...args: any[]) => unknown>;
    components: Record<string, unknown>;
    platformBindings: {
        iOS?: PlatformBindingRegistry;
        Android?: PlatformBindingRegistry;
    };
    capabilities: {
        supportsNativeModules: boolean;
    };
}
export declare function assertPlatformAdapter(adapter: OneNativePlatform): void;
export declare function definePlatform(adapter: OneNativePlatform): OneNativePlatform;
export declare function selectOneNativePlatform(name: OnePlatformName): OneNativePlatform;
export declare const webAdapter: OneNativePlatform;
export declare const rnxAdapter: OneNativePlatform;
export declare const iosAdapter: OneNativePlatform;
export declare const androidAdapter: OneNativePlatform;
//# sourceMappingURL=platform.d.ts.map