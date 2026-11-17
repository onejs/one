import type { PluginOption } from 'vite';
import type { MetroPluginOptions as SharedMetroPluginOptions } from '@vxrn/utils/metroTypes';
import type { loadConfig } from 'metro';
import type { TransformOptions } from '../transformer/babel-core.js';
export type MetroPluginOptions = Omit<SharedMetroPluginOptions, 'argv' | 'defaultConfigOverrides' | 'babelConfig' | 'babelConfigOverrides'> & {
    argv?: Parameters<typeof loadConfig>[0];
    defaultConfigOverrides?: Parameters<typeof loadConfig>[1] | ((defaultConfig: Parameters<typeof loadConfig>[1]) => Parameters<typeof loadConfig>[1]);
    babelConfig?: TransformOptions;
    babelConfigOverrides?: (defaultConfig: TransformOptions) => TransformOptions;
};
export declare function metroPlugin(options?: MetroPluginOptions): PluginOption;
//# sourceMappingURL=metroPlugin.d.ts.map