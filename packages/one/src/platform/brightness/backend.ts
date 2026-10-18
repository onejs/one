import { NitroModules } from 'react-native-nitro-modules'
import type { OneBrightness } from '../specs/OneBrightness.nitro'

let hybrid: OneBrightness | undefined

export function brightnessNative() {
  return (hybrid ??= NitroModules.createHybridObject<OneBrightness>('OneBrightness'))
}
