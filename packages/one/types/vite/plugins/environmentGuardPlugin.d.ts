/**
 * vite plugin that enforces environment guard imports.
 *
 * bare imports like `import 'server-only'` will either be a no-op (allowed)
 * or throw at build/dev time (forbidden) depending on which vite environment
 * is processing the module.
 *
 * | import          | allowed in       | throws in                  |
 * |-----------------|------------------|----------------------------|
 * | server-only     | ssr              | client, ios, android       |
 * | client-only     | client           | ssr, ios, android          |
 * | native-only     | ios, android     | client, ssr                |
 * | web-only        | client, ssr      | ios, android               |
 */
import type { Plugin } from 'vite';
/**
 * returns a virtual module id if the specifier is a guard, otherwise null.
 * pure function extracted for testing.
 */
export declare function resolveEnvironmentGuard(specifier: string, envName: string): string | null;
/**
 * returns the module source for a virtual guard id.
 * pure function extracted for testing.
 */
export declare function loadEnvironmentGuard(id: string): string | null;
export declare function environmentGuardPlugin(): Plugin;
//# sourceMappingURL=environmentGuardPlugin.d.ts.map