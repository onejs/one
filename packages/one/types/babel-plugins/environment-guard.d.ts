/**
 * babel plugin for native (metro) builds that enforces environment guard imports.
 *
 * in native builds, `native-only` imports are allowed (removed as no-ops),
 * while `server-only`, `client-only`, and `web-only` imports are replaced
 * with a throw statement.
 */
import type { PluginObj } from '@babel/core';
declare function environmentGuardBabelPlugin(): PluginObj;
export default environmentGuardBabelPlugin;
//# sourceMappingURL=environment-guard.d.ts.map