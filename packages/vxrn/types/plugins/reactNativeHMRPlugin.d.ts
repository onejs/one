import { type ResolvedConfig } from 'vite';
import type { VXRNOptionsFilled } from '../config/getOptionsFilled';
export declare function reactNativeHMRPlugin({ assetExts, root: rootIn, mode: modeIn, }: Partial<Pick<VXRNOptionsFilled, 'root' | 'mode'>> & {
    assetExts: string[];
}): {
    name: string;
    configResolved(this: void, resolvedConfig: ResolvedConfig): void;
    handleHotUpdate(this: void, { read, modules, file, server }: import("vite").HmrContext): Promise<void>;
};
//# sourceMappingURL=reactNativeHMRPlugin.d.ts.map