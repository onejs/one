import NitroModules
import UIKit

final class HybridOneDevice: HybridOneDeviceSpec {
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
