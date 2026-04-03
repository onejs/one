import { defaultConfig as configOptions } from '@tamagui/config/v5'
import { createTamagui } from '@tamagui/core'
import { animations } from './animations'

if (!configOptions) {
  console.error('[tamagui.config.ts] defaultConfig is', configOptions)
} else if (!configOptions.settings) {
  console.error('[tamagui.config.ts] defaultConfig.settings is', configOptions.settings, 'keys:', Object.keys(configOptions))
}

export const config = createTamagui({
  ...configOptions,
  animations,
  themes: {
    ...configOptions.themes,
    light: {
      ...configOptions.themes.light,
      background: 'white',
      color: 'black',
    },
    dark: {
      ...configOptions.themes.dark,
      background: 'black',
      color: 'white',
    },
  },
  media: {
    ...configOptions.media,
    xsTouch: {
      maxWidth: 660,
      pointer: 'coarse',
    },
  },
  settings: {
    ...configOptions.settings,
    fastSchemeChange: true,
    // avoids CSS bloat so long as you don't need nesting of dark/light themes
    maxDarkLightNesting: 2,
    onlyAllowShorthands: false,
  },
})

export type Conf = typeof config

declare module '@tamagui/core' {
  interface TamaguiCustomConfig extends Conf {}
}

export default config
