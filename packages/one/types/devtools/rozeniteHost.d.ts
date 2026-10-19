import type { ViteDevServer } from 'vite';
export type RozeniteHostOptions = {
    enabled?: boolean;
    include?: string[];
    exclude?: string[];
    pluginDisplay?: 'sidebar' | 'tabs';
};
/**
 * Find Rozenite plugin packages the same way Rozenite's middleware does: a
 * direct dependency with a built `dist/rozenite.json` manifest. Finding them
 * up front lets One keep the stock React Native DevTools frontend when no
 * plugin is installed instead of mounting an empty Rozenite shell.
 */
export declare function findInstalledRozenitePlugins(projectRoot: string): string[];
export type StartedRozeniteHost = {
    plugins: string[];
    dispose: () => Promise<void>;
};
/**
 * Mounts Rozenite's React Native DevTools plugin host into One's dev server.
 *
 * Rozenite already owns the extension convention, plugin discovery, panel
 * rendering and the CDP bridge. One's job is only to serve it on the same dev
 * server as React Native's debugger and patch the debugger frontend URL, which
 * Rozenite's middleware does when it initializes. Returning null means there
 * was nothing to host, so the stock React Native DevTools stays untouched.
 */
export declare function startRozeniteHost(server: ViteDevServer, projectRoot: string, options?: RozeniteHostOptions): Promise<StartedRozeniteHost | null>;
//# sourceMappingURL=rozeniteHost.d.ts.map