import { NitroModules } from 'react-native-nitro-modules'
import type { OneBattery } from '../specs/OneBattery.nitro'

let hybrid: OneBattery | undefined

export function batteryNative(): OneBattery {
  hybrid ??= NitroModules.createHybridObject<OneBattery>('OneBattery')
  return hybrid
}
