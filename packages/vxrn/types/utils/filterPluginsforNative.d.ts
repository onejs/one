import type { Plugin } from "vite";
/**
 * Filter out plugins and plugin hooks that are not needed for (or will even break) React Native.
 */
export declare function filterPluginsForNative(
  plugins: readonly Plugin[],
  {
    isNative,
  }: {
    isNative: boolean;
  },
): Plugin[];
//# sourceMappingURL=filterPluginsForNative.d.ts.map
