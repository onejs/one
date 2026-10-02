import { defaultConfig } from '@tamagui/config/v6'
import { createTamagui } from 'tamagui'
import { animationsRoot } from './animationsRoot'
import { fonts } from './fonts'
export const config = createTamagui({
  ...defaultConfig,
  animations: animationsRoot,
  fonts,
})
export type Conf = typeof config
declare module 'tamagui' {
  interface TamaguiCustomConfig extends Conf {}
  interface TypeOverride {
    groupNames(): 'button' | 'message' | 'icon' | 'item' | 'frame' | 'card'
  }
}
