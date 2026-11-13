import {
  Calendar,
  DateFormatter,
  Locale,
  Locale_Components,
  Measurement,
  MeasurementFormatter,
  NotificationCenter,
  NSLocale,
  NSNotification_Name,
  OperationQueue,
  ProcessInfo,
  TimeZone,
  UnitTemperature,
} from 'one/ios/Foundation'
import { UIDevice } from 'one/ios/UIKit'
import type { HybridObject } from 'react-native-nitro-modules'
import type {
  CalendarInfo,
  DeviceInfo,
  LocalizationInfo,
  LocaleInfo,
  OneDevice,
} from '../specs/OneDevice.nitro'
import {
  describingCalendar,
  isSimulatorEnvironment,
  measurementSystemName,
  normalizeVendorId,
  textDirectionName,
  unicodeCalendar,
} from './map'

// like expo-localization, each preferred language contributes its own
// language fields, while separators, measurement, currency and temperature
// come from the device's current settings.
function getLocales(): LocaleInfo[] {
  const current = Locale.current
  const regionCode = current.region?.identifier
  const temperatureUnit = temperatureUnitName(current)
  const measurementSystem = measurementSystemName(current.measurementSystem.identifier)
  return Locale.preferredLanguages.map((identifier) => {
    const locale = Locale.initIdentifier(identifier)
    const languageCode = locale.language.languageCode?.identifier
    return {
      languageTag: locale.identifier75222('bcp47'),
      languageCode,
      // only a script the tag names, as expo and android report it.
      languageScriptCode:
        Locale_Components.initLocale(locale).languageComponents.script?.identifier,
      regionCode,
      languageRegionCode: locale.region?.identifier ?? regionCode,
      currencyCode: current.currency?.identifier,
      currencySymbol: current.currencySymbol ?? undefined,
      languageCurrencyCode: locale.currency?.identifier,
      languageCurrencySymbol: locale.currencySymbol ?? undefined,
      decimalSeparator: current.decimalSeparator ?? undefined,
      digitGroupingSeparator: current.groupingSeparator ?? undefined,
      textDirection: textDirectionName(
        NSLocale.characterDirection(languageCode ?? identifier)
      ),
      measurementSystem,
      temperatureUnit,
    }
  })
}

function getCalendars(): CalendarInfo[] {
  const template =
    DateFormatter.dateFormatFromTemplateOptionsLocale('j', 0, Locale.current) ?? ''
  return [
    {
      calendar: unicodeCalendar(Calendar.current.identifier),
      timeZone: TimeZone.current.identifier,
      uses24hourClock: template.includes('H') || template.includes('k'),
      firstWeekday: Calendar.current.firstWeekday,
    },
  ]
}

// each subscription owns its observer pair, so removal stops exactly its own
// callbacks. delivery stays on the main queue, as the swift's observers did.
function addLocalizationListener(listener: () => void): () => void {
  const center = NotificationCenter.default
  const queue = OperationQueue.main
  const observers = [
    center.addObserver(NSLocale.currentLocaleDidChangeNotification, null, queue, () => {
      listener()
    }),
    center.addObserver(NSNotification_Name.NSSystemTimeZoneDidChange, null, queue, () => {
      listener()
    }),
  ]
  let removed = false
  return () => {
    if (removed) return
    removed = true
    for (const observer of observers) center.removeObserver(observer)
  }
}

// the unit the device's own formatter shows for a temperature, which
// follows the user's temperature setting, not just the region.
function temperatureUnitName(locale: Locale): string {
  const formatter = MeasurementFormatter.init()
  formatter.locale = locale
  const shown = formatter.stringFrom53753(
    Measurement.init(0, UnitTemperature.celsius)
  )
  return shown.endsWith('F') ? 'fahrenheit' : 'celsius'
}

async function getInfo(): Promise<DeviceInfo> {
  const device = await UIDevice.current
  return {
    model: await device.model,
    systemName: await device.systemName,
    systemVersion: await device.systemVersion,
    interfaceIdiom: await device.userInterfaceIdiom,
    isSimulator: isSimulatorEnvironment(ProcessInfo.processInfo.environment),
    vendorIdentifier: normalizeVendorId(await device.identifierForVendor),
  }
}

async function getLocalizationInfo(): Promise<LocalizationInfo> {
  const current = Locale.current
  const zone = TimeZone.current
  return {
    localeIdentifier: current.identifier75222('bcp47'),
    preferredLanguages: Locale.preferredLanguages,
    calendarIdentifier: describingCalendar(Calendar.current.identifier),
    timeZoneIdentifier: zone.identifier,
    timeZoneOffsetSeconds: zone.secondsFromGMT(),
    currencyCode: current.currency?.identifier,
  }
}

const backend = {
  getInfo,
  getLocalizationInfo,
  getLocales,
  getCalendars,
  addLocalizationListener,
} satisfies Omit<OneDevice, keyof HybridObject<{}>>

export function deviceNative() {
  return backend
}
