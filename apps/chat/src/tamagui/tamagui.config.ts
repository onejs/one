import { defaultConfig, createSystemFont } from '@tamagui/config/v4'
import { createTamagui } from 'tamagui'
import { animations } from './animations'

const heading = createSystemFont({
  sizeSize: (x) => Math.round(x * 1.25),
  sizeLineHeight: (x) => Math.round(x * 1.33 + 10),
})

const mono = createSystemFont({
  font: {
    family: '"JetBrains Mono"',
    weight: {
      0: '600',
    },
  },
})

export const config = createTamagui({
  ...defaultConfig,
  fonts: {
    ...defaultConfig.fonts,
    heading,
    mono,
  },
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
