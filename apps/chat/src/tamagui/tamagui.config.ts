import { defaultConfig } from '@tamagui/config/v4'
import { createTamagui } from 'tamagui'
import { animations } from './animations'

export const config = createTamagui({
  ...defaultConfig,
  animations,
  settings: {
    ...defaultConfig.settings,
    styleCompat: 'react-native',
    allowedStyleValues: 'somewhat-strict-web',
  },
})

export type Conf = typeof config

declare module 'tamagui' {
  interface TamaguiCustomConfig extends Conf {}

  interface TypeOverride {
    groupNames(): 'message' | 'icon'
  }
}

export default config
