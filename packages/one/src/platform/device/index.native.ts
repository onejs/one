import { Platform } from 'react-native'
import { NitroModules } from 'react-native-nitro-modules'
import type { DeviceInfo, LocalizationInfo, OneDevice } from '../specs/OneDevice.nitro'

export type { DeviceInfo, LocalizationInfo }

let hybrid: OneDevice | undefined

function getInfo(): Promise<DeviceInfo> {
  if (Platform.OS !== 'ios') throw new Error('Device requires an iOS native build')
  hybrid ??= NitroModules.createHybridObject<OneDevice>('OneDevice')
  return hybrid.getInfo()
}

function getLocalizationInfo(): Promise<LocalizationInfo> {
  if (Platform.OS !== 'ios') throw new Error('Device requires an iOS native build')
  hybrid ??= NitroModules.createHybridObject<OneDevice>('OneDevice')
  return hybrid.getLocalizationInfo()
}

export const Device = Object.freeze({ getInfo, getLocalizationInfo })
