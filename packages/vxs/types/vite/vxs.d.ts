import { type UserConfig, type PluginOption } from 'vite';
import type { VXSPluginOptions } from './types';
export declare function loadUserVXSOptions(command: 'serve'): Promise<VXSPluginOptions>;
export declare function getUserVXSOptions(config: UserConfig): VXSPluginOptions | undefined;
export declare function vxs(options?: VXSPluginOptions): PluginOption;
//# sourceMappingURL=vxs.d.ts.map