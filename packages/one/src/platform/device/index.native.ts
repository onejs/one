import { deviceNative as native } from './backend'
import type { DeviceInfo, LocalizationInfo } from '../specs/OneDevice.nitro'

export type { DeviceInfo, LocalizationInfo }

function getInfo(): Promise<DeviceInfo> {
  return native().getInfo()
}

function getLocalizationInfo(): Promise<LocalizationInfo> {
  return native().getLocalizationInfo()
}

export const Device = Object.freeze({ getInfo, getLocalizationInfo })
