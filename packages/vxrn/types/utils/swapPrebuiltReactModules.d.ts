import type { Plugin } from 'vite';
type PrebuildVersions = {
    react: string;
    reactNative: string;
};
export declare function prebuildReactNativeModules(cacheDir: string, versions?: PrebuildVersions): Promise<{
    reactJSX: string;
    react: string;
    reactNative: string;
} | undefined>;
export declare function swapPrebuiltReactModules(cacheDir: string, versions?: PrebuildVersions): Promise<Plugin>;
export {};
//# sourceMappingURL=swapPrebuiltReactModules.d.ts.map