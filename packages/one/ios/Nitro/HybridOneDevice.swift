import NitroModules
import UIKit

final class HybridOneDevice: HybridOneDeviceSpec {
  private let lock = NSLock()
  private var listeners: [Int: () -> Void] = [:]
  private var nextListenerId = 0
  private var observers: [NSObjectProtocol] = []

  // like expo-localization, each preferred language contributes its own
  // language fields, while separators, measurement, currency and temperature
  // come from the device's current settings.
  func getLocales() throws -> [LocaleInfo] {
    let current = Locale.current
    let regionCode = current.region?.identifier
    let temperatureUnit = Self.temperatureUnit(current)
    return Locale.preferredLanguages.map { identifier in
      let locale = Locale(identifier: identifier)
      return LocaleInfo(
        languageTag: locale.identifier(.bcp47),
        languageCode: locale.language.languageCode?.identifier,
        // only a script the tag names, as expo and android report it.
        languageScriptCode: Locale.Components(locale: locale).languageComponents.script?.identifier,
        regionCode: regionCode,
        languageRegionCode: locale.region?.identifier ?? regionCode,
        currencyCode: current.currency?.identifier,
        currencySymbol: current.currencySymbol,
        languageCurrencyCode: locale.currency?.identifier,
        languageCurrencySymbol: locale.currencySymbol,
        decimalSeparator: current.decimalSeparator,
        digitGroupingSeparator: current.groupingSeparator,
        textDirection: Locale.characterDirection(
          forLanguage: locale.language.languageCode?.identifier ?? identifier) == .rightToLeft
          ? "rtl" : "ltr",
        measurementSystem: Self.measurementSystem(current.measurementSystem),
        temperatureUnit: temperatureUnit
      )
    }
  }

  func getCalendars() throws -> [CalendarInfo] {
    let calendar = Calendar.current
    let template = DateFormatter.dateFormat(fromTemplate: "j", options: 0, locale: .current) ?? ""
    return [
      CalendarInfo(
        calendar: Self.unicodeCalendar(calendar.identifier),
        timeZone: TimeZone.current.identifier,
        uses24hourClock: template.contains("H") || template.contains("k"),
        firstWeekday: Double(calendar.firstWeekday)
      )
    ]
  }

  // the first listener starts the observers and the last removal stops them,
  // so a locale change can never race the subscription.
  func addLocalizationListener(listener: @escaping () -> Void) throws -> () -> Void {
    lock.lock()
    defer { lock.unlock() }
    let id = nextListenerId
    nextListenerId += 1
    listeners[id] = listener
    if observers.isEmpty {
      let center = NotificationCenter.default
      for name in [NSLocale.currentLocaleDidChangeNotification, .NSSystemTimeZoneDidChange] {
        observers.append(
          center.addObserver(forName: name, object: nil, queue: .main) { [weak self] _ in
            self?.emit()
          })
      }
    }
    return { [weak self] in self?.removeListener(id) }
  }

  private func emit() {
    lock.lock()
    let current = Array(listeners.values)
    lock.unlock()
    current.forEach { $0() }
  }

  private func removeListener(_ id: Int) {
    lock.lock()
    defer { lock.unlock() }
    listeners.removeValue(forKey: id)
    if listeners.isEmpty {
      observers.forEach { NotificationCenter.default.removeObserver($0) }
      observers = []
    }
  }

  // the unit the device's own formatter shows for a temperature, which
  // follows the user's temperature setting, not just the region.
  private static func temperatureUnit(_ locale: Locale) -> String {
    let formatter = MeasurementFormatter()
    formatter.locale = locale
    let shown = formatter.string(from: Measurement(value: 0, unit: UnitTemperature.celsius))
    return shown.hasSuffix("F") ? "fahrenheit" : "celsius"
  }

  private static func measurementSystem(_ system: Locale.MeasurementSystem) -> String {
    switch system {
    case .us: return "us"
    case .uk: return "uk"
    default: return "metric"
    }
  }

  // foundation calendar identifiers to unicode calendar types, expo's terms.
  private static func unicodeCalendar(_ identifier: Calendar.Identifier) -> String {
    switch identifier {
    case .gregorian: return "gregory"
    case .ethiopicAmeteMihret: return "ethiopic"
    case .ethiopicAmeteAlem: return "ethioaa"
    case .islamicCivil: return "islamic-civil"
    case .islamicTabular: return "islamic-tbla"
    case .islamicUmmAlQura: return "islamic-umalqura"
    case .republicOfChina: return "roc"
    default: return String(describing: identifier)
    }
  }

  func getInfo() throws -> Promise<DeviceInfo> {
    let promise = Promise<DeviceInfo>()
    DispatchQueue.main.async {
      let device = UIDevice.current
      #if targetEnvironment(simulator)
      let isSimulator = true
      #else
      let isSimulator = false
      #endif
      promise.resolve(withResult: DeviceInfo(
        model: device.model,
        systemName: device.systemName,
        systemVersion: device.systemVersion,
        interfaceIdiom: Self.idiom(device.userInterfaceIdiom),
        isSimulator: isSimulator,
        vendorIdentifier: device.identifierForVendor?.uuidString
      ))
    }
    return promise
  }

  func getLocalizationInfo() throws -> Promise<LocalizationInfo> {
    let promise = Promise<LocalizationInfo>()
    DispatchQueue.main.async {
      let locale = Locale.current
      let timeZone = TimeZone.current
      promise.resolve(withResult: LocalizationInfo(
        localeIdentifier: locale.identifier(.bcp47),
        preferredLanguages: Locale.preferredLanguages,
        calendarIdentifier: String(describing: Calendar.current.identifier),
        timeZoneIdentifier: timeZone.identifier,
        timeZoneOffsetSeconds: Double(timeZone.secondsFromGMT()),
        currencyCode: locale.currency?.identifier
      ))
    }
    return promise
  }

  private static func idiom(_ value: UIUserInterfaceIdiom) -> String {
    switch value {
    case .phone: return "phone"
    case .pad: return "pad"
    case .tv: return "tv"
    case .carPlay: return "carPlay"
    case .mac: return "mac"
    case .vision: return "vision"
    case .unspecified: return "unspecified"
    @unknown default: return "unspecified"
    }
  }
}
