import { NitroModules } from 'react-native-nitro-modules'
import type { OneKeepAwake } from '../specs/OneKeepAwake.nitro'

let hybrid: OneKeepAwake | undefined

export function keepAwakeNative() {
  return (hybrid ??= NitroModules.createHybridObject<OneKeepAwake>('OneKeepAwake'))
}
