import type { PluginOption } from "vite";
export type ExpoManifestRequestHandlerPluginPluginOptions = {
  /**
   * Overrides the main module name which is normally defined as the `main` field in `package.json`.
   *
   * This will affect the `launchAsset.url` field in the Expo manifest response.
   *
   * It can be used to change the entry point of the React Native app without the need of using
   * the `main` field in `package.json`.
   */
  mainModuleName?: string;
};
export declare function expoManifestRequestHandlerPlugin(
  options?: ExpoManifestRequestHandlerPluginPluginOptions,
): PluginOption;
//# sourceMappingURL=expoManifestRequestHandlerPlugin.d.ts.map
