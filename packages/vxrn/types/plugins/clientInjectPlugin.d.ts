import type { Plugin, ResolvedConfig } from "vite";
export declare function getServerConfigPlugin(): {
  name: string;
  configResolved(
    this: import("vite").MinimalPluginContextWithoutEnvironment,
    conf: ResolvedConfig,
  ): void;
};
/**
 * some values used by the client needs to be dynamically injected by the server
 * @server-only
 */
export declare function nativeClientInjectPlugin(): Plugin;
//# sourceMappingURL=clientInjectPlugin.d.ts.map
