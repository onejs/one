import { type PluginOption } from "vite";
import type {
  MetroPluginOptions,
  ExpoManifestRequestHandlerPluginPluginOptions,
} from "@vxrn/vite-plugin-metro";
/**
 * This is considered private API for now, and may change anytime.
 */
type VxrnPluginOptions = {
  /** Passing a non-null value will enable metro mode. */
  metro?: (MetroPluginOptions & ExpoManifestRequestHandlerPluginPluginOptions) | null;
};
/**
 * [Experimental] VxRN as a Vite plugin.
 *
 * Originally, `vxrn` is a CLI tool that uses Vite APIs under the hood.
 * However, by doing so it makes `vxrn` hard to compose with other tools,
 * also we'll need to tangle with things such as user configuration loading.
 *
 * This is a experimental new approach that allows `vxrn` to be used as a Vite plugin.
 */
export declare function vxrn(options?: VxrnPluginOptions): PluginOption;
export default vxrn;
//# sourceMappingURL=vxrn-vite-plugin.d.ts.map
