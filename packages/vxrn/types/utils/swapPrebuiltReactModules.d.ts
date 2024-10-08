import type { Plugin } from 'vite';
type PrebuildVersions = {
    react: string;
    reactNative: string;
};
export declare function prebuildReactNativeModules(cacheDir: string, versions?: PrebuildVersions, internal?: {
    mode?: 'dev' | 'prod';
}): Promise<void>;
export declare function swapPrebuiltReactModules(cacheDir: string, versions?: PrebuildVersions, internal?: {
    mode?: 'dev' | 'prod';
}): Promise<Plugin>;
export {};
//# sourceMappingURL=swapPrebuiltReactModules.d.ts.map