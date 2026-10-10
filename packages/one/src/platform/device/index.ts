import { Device as unavailable } from './unavailable'
import type { DeviceInfo, LocalizationInfo } from '../specs/OneDevice.nitro'
export type { DeviceInfo, LocalizationInfo }

export const Device = Object.freeze({
  getInfo: async (): Promise<DeviceInfo> => {
    if (typeof window === 'undefined') return unavailable.getInfo()
    // browsers deliberately do not expose hardware identity or vendor ids.
    return {
      model: '',
      systemName: navigator.platform,
      systemVersion: '',
      interfaceIdiom: 'unspecified',
      isSimulator: false,
    }
  },
  getLocalizationInfo: async (): Promise<LocalizationInfo> => {
    if (typeof window === 'undefined') return unavailable.getLocalizationInfo()
    const options = new Intl.DateTimeFormat(navigator.language).resolvedOptions()
    return {
      localeIdentifier: options.locale,
      preferredLanguages: [...navigator.languages],
      calendarIdentifier: options.calendar,
      timeZoneIdentifier: options.timeZone,
      timeZoneOffsetSeconds: -new Date().getTimezoneOffset() * 60,
    }
  },
})
