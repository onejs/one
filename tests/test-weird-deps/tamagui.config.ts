import { defaultConfig as configOptions } from '@tamagui/config/v5'
import { animations } from '@tamagui/config/v5-css'
import { createTamagui } from '@tamagui/core'

export const config = createTamagui({
  ...configOptions,
  animations,
})

export type Conf = typeof config

declare module '@tamagui/core' {
  interface TamaguiCustomConfig extends Conf {}
}

export default config
