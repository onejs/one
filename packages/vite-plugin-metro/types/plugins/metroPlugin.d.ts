import type { PluginOption } from 'vite';
import type { loadConfig as loadConfigT } from 'metro';
type MetroYargArguments = Parameters<typeof loadConfigT>[0];
type MetroInputConfig = Parameters<typeof loadConfigT>[1];
export declare function metroPlugin({ argv, defaultConfigOverrides, }?: {
    argv?: MetroYargArguments;
    defaultConfigOverrides?: MetroInputConfig | ((defaultConfig: MetroInputConfig) => MetroInputConfig);
}): PluginOption;
export {};
//# sourceMappingURL=metroPlugin.d.ts.map