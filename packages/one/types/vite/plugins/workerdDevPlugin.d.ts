import { type PluginOption } from 'vite';
import type { RouteIndex } from '../../utils/routeIndex';
import type { One } from '../types';
import { shouldEnableWorkerdDev } from '../cloudflareWranglerConfig';
export { shouldEnableWorkerdDev };
export declare const workerdDevEntryId = "virtual:one-workerd-dev-entry";
export declare function generateWorkerdDevEntryModule(args: {
    root: string;
    options: One.PluginOptions;
    routerRoot: string;
    routePaths: string[];
    preloads: string[];
}): string;
export declare function createWorkerdDevPlugins(options: One.PluginOptions, root: string, routeIndex: RouteIndex): PluginOption[];
//# sourceMappingURL=workerdDevPlugin.d.ts.map