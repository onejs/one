import type { Plugin } from 'vite';
export declare function getReactNativeAssetData({ id, root, mode, }: {
    id: string;
    root: string;
    mode: 'dev' | 'prod';
}): Promise<{
    __packager_asset: boolean;
    fileSystemLocation: string;
    relativeFileSystemLocation: string;
    httpServerLocation: string;
    scales: number[];
    name: string;
    type: string;
    hash: string;
}>;
type ReactNativeDevAssetPluginConfig = {
    /** The list file extensions to be treated as assets. Assets are recognized by their extension. */
    assetExts: string[];
    /** Defaults to `'dev'`. */
    mode?: 'dev' | 'prod';
    /** Only needed while building the release bundle. */
    assetsDest?: string;
};
export declare function reactNativeDevAssetPlugin(options: ReactNativeDevAssetPluginConfig): Plugin;
export {};
//# sourceMappingURL=reactNativeDevAssetPlugin.d.ts.map