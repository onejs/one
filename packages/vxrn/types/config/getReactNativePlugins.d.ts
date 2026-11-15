import type { MetroPluginOptions } from '@vxrn/vite-plugin-metro';
import type { PluginOption } from 'vite';
import type { VXRNOptionsFilled } from './getOptionsFilled.js';
export declare function getReactNativePlugins(config?: Partial<Pick<VXRNOptionsFilled, 'cacheDir' | 'debugBundle' | 'debugBundlePaths' | 'entries' | 'patches'>>, { metro, }?: {
    /** Passing a non-null value will enable metro mode */
    metro?: MetroPluginOptions | null;
}): PluginOption[];
//# sourceMappingURL=getReactNativePlugins.d.ts.map