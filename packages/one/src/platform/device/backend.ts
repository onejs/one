import { NitroModules } from 'react-native-nitro-modules'
import type { OneDevice } from '../specs/OneDevice.nitro'

let hybrid: OneDevice | undefined

export function deviceNative(): OneDevice {
  hybrid ??= NitroModules.createHybridObject<OneDevice>('OneDevice')
  return hybrid
}
