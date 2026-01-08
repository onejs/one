/**
 * Babel plugin to remove server-only code (loader, generateStaticParams) from native bundles.
 *
 * This plugin transforms route files to remove server-only exports so they don't
 * get included in the native bundle. It's the Metro equivalent of clientTreeShakePlugin.
 *
 * What it does:
 * 1. Captures referenced identifiers BEFORE removing exports
 * 2. Removes `export function loader() { ... }` and `export const loader = ...`
 * 3. Removes `export function generateStaticParams() { ... }` and `export const generateStaticParams = ...`
 * 4. Runs dead code elimination to remove imports that were only used by removed functions
 * 5. Adds empty stubs back to prevent "missing export" errors
 *
 * Options:
 * - routerRoot: The router root directory (e.g., 'app'). Only files in this directory are transformed.
 */
import type { PluginObj } from '@babel/core';
type PluginOptions = {
    routerRoot?: string;
};
declare function removeServerCodePlugin(_: unknown, options: PluginOptions): PluginObj;
export default removeServerCodePlugin;
//# sourceMappingURL=remove-server-code.d.ts.map