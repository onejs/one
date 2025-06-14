import type { VXRNOptionsFilled } from '../config/getOptionsFilled';
export declare function reactNativeHMRPlugin({ root, assetExts, mode, }: VXRNOptionsFilled & {
    assetExts: string[];
}): {
    name: string;
    handleHotUpdate(this: void, { read, modules, file, server }: import("vite").HmrContext): Promise<void>;
};
//# sourceMappingURL=reactNativeHMRPlugin.d.ts.map