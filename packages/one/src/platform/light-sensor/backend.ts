import { NitroModules } from 'react-native-nitro-modules'
import type { OneLightSensor } from '../specs/OneLightSensor.nitro'
import type { LightSensorBackend } from './types'

let hybrid: OneLightSensor | undefined

export function lightSensorNative(): LightSensorBackend {
  hybrid ??= NitroModules.createHybridObject<OneLightSensor>('OneLightSensor')
  return hybrid
}
