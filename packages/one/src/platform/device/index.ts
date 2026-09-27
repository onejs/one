import type { DeviceInfo, LocalizationInfo } from '../specs/OneDevice.nitro'

export type { DeviceInfo, LocalizationInfo }

export const Device = Object.freeze({
  getInfo: (): Promise<DeviceInfo> => {
    throw new Error('Device requires an iOS native build')
  },
  getLocalizationInfo: (): Promise<LocalizationInfo> => {
    throw new Error('Device requires an iOS native build')
  },
})
