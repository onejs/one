import { type PluginOption } from 'vite';
import '../polyfills-server';
import type { VXS } from './types';
export declare function vxs(options?: VXS.PluginOptions): PluginOption;
export declare function loadUserVXSOptions(command: 'serve' | 'build'): Promise<VXS.PluginOptions>;
//# sourceMappingURL=vxs.d.ts.map