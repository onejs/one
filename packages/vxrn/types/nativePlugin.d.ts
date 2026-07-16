import type { Plugin as RolldownPlugin } from 'rolldown';
import type { Plugin as VitePlugin, PluginOption } from 'vite';
export type NativePluginContext = {
    root: string;
    platform: 'ios' | 'android';
    dev: boolean;
};
export type NativePluginFactory = (context: NativePluginContext) => RolldownPlugin | readonly RolldownPlugin[];
/**
 * Adds a native Rolldown implementation to a Vite plugin.
 *
 * VxRN only forwards plugins with this explicit provider into native builds.
 */
export declare function withNativePlugin(plugin: VitePlugin, factory: NativePluginFactory): VitePlugin;
export declare function getNativePlugins(plugins: readonly VitePlugin[], context: NativePluginContext): RolldownPlugin[];
export declare function getNativePluginsFromOptions(pluginOptions: readonly PluginOption[], context: NativePluginContext): Promise<RolldownPlugin[]>;
//# sourceMappingURL=nativePlugin.d.ts.map