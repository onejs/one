import { defaultConfig as configOptions } from '@tamagui/config/v5'
import { animations } from '@tamagui/config/v5-css'
import { createTamagui } from '@tamagui/core'

export const config = createTamagui({
  ...configOptions,
  animations,
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
