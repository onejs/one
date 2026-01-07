import type { PluginOption } from "vite";
/**
 * Configs that should (currently) apply when using VxRN in non-CLI mode (vxrn-vite-plugin.ts).
 *
 * By running the `vxrn` CLI, equivalent things are done but using different methods
 * that isn't applicable with pure Vite plugins.
 *
 * We can refactor this in the future to make it more consistent. Having this is just
 * to avoid changing too much at once and cause bugs in the original CLI mode.
 */
export declare function getNonCliModeOnlyVitePlugins(): PluginOption[];
//# sourceMappingURL=getNonCliModeOnlyVitePlugins.d.ts.map
