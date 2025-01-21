import { defaultConfig } from '@tamagui/config/v4'
import { createTamagui } from 'tamagui'

/**
 * Welcome to Tamagui, this project uses the default config.
 *
 * To learn more about it, see:
 *   https://tamagui.dev/docs/core/config-v4
 *
 */

export const config = createTamagui(defaultConfig)

export type Conf = typeof config

declare module 'tamagui' {
  interface TamaguiCustomConfig extends Conf {}

  // for group types:
  // interface TypeOverride {
  //   groupNames(): 'message'
  // }
}

export default config
