import type { Plugin } from 'vite';
export declare const getPrebuilds: (cacheDir: string) => {
    reactJSX: string;
    react: string;
    reactNative: string;
};
export declare function prebuildReactNativeModules(cacheDir: string): Promise<void>;
export declare function swapPrebuiltReactModules(cacheDir: string): Promise<Plugin>;
//# sourceMappingURL=swapPrebuiltReactModules.d.ts.map