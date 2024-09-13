import { type PluginOption, type UserConfig } from 'vite';
import '../polyfills-server';
import type { VXS } from './types';
export declare function getUserVXSOptions(config: UserConfig): VXS.PluginOptions | undefined;
export declare function loadUserVXSOptions(command: 'serve'): Promise<VXS.PluginOptions>;
export declare function vxs(options?: VXS.PluginOptions): PluginOption;
//# sourceMappingURL=vxs.d.ts.map