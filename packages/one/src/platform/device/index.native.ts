import { Platform } from 'react-native'
import { NitroModules } from 'react-native-nitro-modules'
import type { DeviceInfo, OneDevice } from '../specs/OneDevice.nitro'

export type { DeviceInfo }

let hybrid: OneDevice | undefined

function getInfo(): Promise<DeviceInfo> {
  if (Platform.OS !== 'ios') throw new Error('Device requires an iOS native build')
  hybrid ??= NitroModules.createHybridObject<OneDevice>('OneDevice')
  return hybrid.getInfo()
}

export const Device = Object.freeze({ getInfo })
