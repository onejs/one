import type { deviceNative } from './backend'
import type { DeviceInfo, LocalizationInfo } from '../specs/OneDevice.nitro'

// required on first use: the ios backend evaluates its framework bindings on load
const native: typeof deviceNative = () => require('./backend').deviceNative()

export type { DeviceInfo, LocalizationInfo }

function getInfo(): Promise<DeviceInfo> {
  return native().getInfo()
}

function getLocalizationInfo(): Promise<LocalizationInfo> {
  return native().getLocalizationInfo()
}

export const Device = Object.freeze({ getInfo, getLocalizationInfo })
