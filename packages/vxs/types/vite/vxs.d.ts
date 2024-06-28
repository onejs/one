import { type UserConfig, type PluginOption } from 'vite';
import type { VXS } from './types';
export declare function loadUserVXSOptions(command: 'serve'): Promise<VXS.PluginOptions>;
export declare function getUserVXSOptions(config: UserConfig): VXS.PluginOptions | undefined;
export declare function vxs(options?: VXS.PluginOptions): PluginOption;
//# sourceMappingURL=vxs.d.ts.map