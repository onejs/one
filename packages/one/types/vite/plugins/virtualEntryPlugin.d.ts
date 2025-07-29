import type { Plugin } from 'vite';
import type { One } from '../types';
export declare function createVirtualEntry(options: {
    root: string;
    router?: {
        ignoredRouteFiles?: Array<string>;
    };
    flags: One.Flags;
}): Plugin;
//# sourceMappingURL=virtualEntryPlugin.d.ts.map