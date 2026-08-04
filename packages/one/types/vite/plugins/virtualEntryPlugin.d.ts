import type { Plugin } from 'vite';
import type { RouteIndex } from '../../utils/routeIndex';
import type { One } from '../types';
export declare function createVirtualEntry(options: {
    root: string;
    router?: One.PluginOptions['router'];
    flags: One.Flags;
    setupFile?: One.PluginOptions['setupFile'];
    routeIndex: RouteIndex;
}): Plugin;
//# sourceMappingURL=virtualEntryPlugin.d.ts.map