/**
 * Babel plugin to remove server-only code (loader, generateStaticParams) from native bundles.
 *
 * This is the Metro equivalent of clientTreeShakePlugin. It:
 * 1. Captures referenced identifiers BEFORE removing exports (critical for DCE)
 * 2. Removes server-only exports (loader, generateStaticParams)
 * 3. Re-parses the modified code and runs standalone DCE with the pre-removal references
 * 4. Adds empty stubs back to prevent "missing export" errors
 *
 * The re-parse step is necessary because babel-dead-code-elimination uses NodePath
 * identity (Set.has) which breaks when called within a babel plugin's traversal context
 * due to different NodePath instances across traversal boundaries.
 */
import type { PluginObj } from '@babel/core';
type PluginOptions = {
    routerRoot?: string;
};
declare function removeServerCodePlugin(_: unknown, options: PluginOptions): PluginObj;
export default removeServerCodePlugin;
//# sourceMappingURL=remove-server-code.d.ts.map