import { defaultConfig } from '@tamagui/config/v5'
import { animations } from '@tamagui/config/v5-css'
import { createTamagui } from 'tamagui'

/**
 * Welcome to Tamagui, this project uses the default config.
 *
 * To learn more about it, see:
 *   https://tamagui.dev/docs/core/config-v5
 *
 */

export const config = createTamagui({
  ...defaultConfig,
  animations,
})

export type Conf = typeof config

declare module 'tamagui' {
  interface TamaguiCustomConfig extends Conf {}

  // for group types:
  // interface TypeOverride {
  //   groupNames(): 'message'
  // }
}

export default config
