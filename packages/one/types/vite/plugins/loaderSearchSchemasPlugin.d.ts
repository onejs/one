import type { Plugin } from 'vite';
import type { RouteIndex } from '../../utils/routeIndex';
import type { One } from '../types';
/**
 * Hands the search schemas that components pass to `useSearchParams(schema)` to the
 * loader of the route they render under, so the server validates the query before
 * the loader runs.
 *
 * Only server builds are touched. A route module that exports a loader and has
 * schemas in its route or layouts gets an `__oneSearchSchemas` export, a list of
 * functions that read each schema. A module with no schemas is left as it is.
 */
export declare function loaderSearchSchemasPlugin(options: One.PluginOptions, routeIndex: RouteIndex): Plugin;
//# sourceMappingURL=loaderSearchSchemasPlugin.d.ts.map