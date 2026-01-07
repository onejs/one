import { config as configOptions } from "@tamagui/config/v3";
import { createTamagui } from "@tamagui/core";
import { animations } from "./animations";

export const config = createTamagui({
  ...configOptions,
  animations,
  themes: {
    ...configOptions.themes,
    light: {
      ...configOptions.themes.light,
      background: "white",
      color: "black",
    },
    dark: {
      ...configOptions.themes.dark,
      background: "black",
      color: "white",
    },
  },
  media: {
    ...configOptions.media,
    xsTouch: {
      maxWidth: configOptions.media.xs.maxWidth,
      pointer: "coarse",
    },
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
