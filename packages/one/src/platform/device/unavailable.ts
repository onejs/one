import type { DeviceInfo, LocalizationInfo } from '../specs/OneDevice.nitro'

export type { DeviceInfo, LocalizationInfo }

export const Device = Object.freeze({
  getInfo: (): Promise<DeviceInfo> => {
    return Promise.resolve({
      model: '',
      systemName: '',
      systemVersion: '',
      interfaceIdiom: '',
      isSimulator: false,
    })
  },
  getLocalizationInfo: (): Promise<LocalizationInfo> => {
    return Promise.resolve({
      localeIdentifier: '',
      preferredLanguages: [],
      calendarIdentifier: '',
      timeZoneIdentifier: '',
      timeZoneOffsetSeconds: 0,
    })
  },
})
