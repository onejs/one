import { config as configOptions } from "@tamagui/config/v3";
import { createTamagui } from "@tamagui/core";

export const config = createTamagui({
  ...configOptions,
  media: {
    sm: { maxWidth: 800 },
    md: { minWidth: 801 },
    lg: { minWidth: 1201 },
  },
  settings: {
    ...configOptions.settings,
    fastSchemeChange: true,
    // avoids CSS bloat so long as you don't need nesting of dark/light themes
    maxDarkLightNesting: 2,
  },
});

export type Conf = typeof config;

declare module "@tamagui/core" {
  interface TamaguiCustomConfig extends Conf {}
}

export default config;
