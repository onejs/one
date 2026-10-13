import NitroModules
import UIKit

final class HybridOneDevice: HybridOneDeviceSpec {
  private let lock = NSLock()
  private var listeners: [Int: () -> Void] = [:]
  private var nextListenerId = 0
  private var observers: [NSObjectProtocol] = []

  // regions that read temperature in fahrenheit. foundation has no direct
  // temperature preference, so the region decides, as in expo-localization.
  private static let fahrenheitRegions: Set<String> = [
    "US", "BS", "BZ", "KY", "LR", "GU", "MH", "FM", "PW", "VI", "MP", "AS", "UM",
  ]

  func getLocales() throws -> [LocaleInfo] {
    let current = Locale.current
    let regionCode = current.region?.identifier
    return Locale.preferredLanguages.map { identifier in
      let locale = Locale(identifier: identifier)
      let languageRegion = locale.region?.identifier ?? regionCode
      return LocaleInfo(
        languageTag: locale.identifier(.bcp47),
        languageCode: locale.language.languageCode?.identifier,
        languageScriptCode: locale.language.script?.identifier,
        regionCode: regionCode,
        languageRegionCode: languageRegion,
        currencyCode: current.currency?.identifier,
        currencySymbol: Self.currencySymbol(code: current.currency?.identifier, locale: locale),
        languageCurrencyCode: locale.currency?.identifier,
        languageCurrencySymbol: Self.currencySymbol(code: locale.currency?.identifier, locale: locale),
        decimalSeparator: locale.decimalSeparator,
        digitGroupingSeparator: locale.groupingSeparator,
        textDirection: Locale.characterDirection(
          forLanguage: locale.language.languageCode?.identifier ?? identifier) == .rightToLeft
          ? "rtl" : "ltr",
        measurementSystem: Self.measurementSystem(locale.measurementSystem),
        temperatureUnit: languageRegion.map {
          Self.fahrenheitRegions.contains($0) ? "fahrenheit" : "celsius"
        }
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

  private static func currencySymbol(code: String?, locale: Locale) -> String? {
    guard let code else { return nil }
    let formatter = NumberFormatter()
    formatter.numberStyle = .currency
    formatter.locale = locale
    formatter.currencyCode = code
    return formatter.currencySymbol
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
