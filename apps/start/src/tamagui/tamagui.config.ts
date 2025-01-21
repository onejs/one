import { defaultConfig, tamaguiThemes } from '@tamagui/config/v4'
import { createTamagui } from 'tamagui'
import { fonts } from './fonts'

export const config = createTamagui({
  ...defaultConfig,
  themes: tamaguiThemes,
  fonts,
})

export type Conf = typeof config

declare module 'tamagui' {
  interface TamaguiCustomConfig extends Conf {}

  interface TypeOverride {
    groupNames(): 'card'
  }
}

export default config
