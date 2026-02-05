import { defaultConfig as configOptions } from '@tamagui/config/v5'
import { createTamagui } from '@tamagui/core'
import { animations } from './animations'

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
  settings: {
    ...configOptions.settings,
    fastSchemeChange: true,
    maxDarkLightNesting: 2,
    onlyAllowShorthands: false,
  },
})

export type Conf = typeof config

declare module '@tamagui/core' {
  interface TamaguiCustomConfig extends Conf {}
}

export default config
