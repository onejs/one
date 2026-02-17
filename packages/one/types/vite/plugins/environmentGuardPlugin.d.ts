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
declare const GUARD_SPECIFIERS: readonly ["server-only", "client-only", "native-only", "web-only"];
type GuardSpecifier = (typeof GUARD_SPECIFIERS)[number];
export type EnvironmentGuardOptions = {
    /**
     * Disable all environment guard checks. When true, all guard imports
     * become no-ops regardless of environment.
     */
    disabled?: boolean;
    /**
     * Disable specific guard types. For example, if a library imports
     * 'client-only' but you're only importing utilities that work fine
     * on the server, you can disable just that guard.
     *
     * @example
     * disableGuards: ['client-only']
     */
    disableGuards?: GuardSpecifier[];
};
/**
 * returns a virtual module id if the specifier is a guard, otherwise null.
 * pure function extracted for testing.
 */
export declare function resolveEnvironmentGuard(specifier: string, envName: string, options?: EnvironmentGuardOptions): string | null;
/**
 * returns the module source for a virtual guard id.
 * pure function extracted for testing.
 */
export declare function loadEnvironmentGuard(id: string): string | null;
export declare function environmentGuardPlugin(options?: EnvironmentGuardOptions): Plugin;
export {};
//# sourceMappingURL=environmentGuardPlugin.d.ts.map