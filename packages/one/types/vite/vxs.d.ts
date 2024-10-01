import { type PluginOption } from 'vite';
import '../polyfills-server';
import type { One } from './types';
export declare function one(options?: One.PluginOptions): PluginOption;
export declare function loadUserOneOptions(command: 'serve' | 'build'): Promise<One.PluginOptions>;
//# sourceMappingURL=vxs.d.ts.map