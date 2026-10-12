import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import sharp from 'sharp'

// actual VisionKit and production Swift; transport structs stand in for generated C++ ABI.
const udid = process.env.SIMULATOR_UDID
if (!udid) throw new Error('set SIMULATOR_UDID to a claimed iOS 27 simulator')
const output = '/tmp/one-data-scanner-proof'
const app = resolve(output, 'DataScannerProof.app')
mkdirSync(app, { recursive: true })
const root = resolve(import.meta.dir, '../../../packages/one')
const promise = readFileSync(
  resolve(
    import.meta.dir,
    '../../../node_modules/react-native-nitro-modules/ios/core/Promise.swift'
  ),
  'utf8'
)
const production = [
  'OneUIKitPresentation.swift',
  'HybridOneDocumentCamera.swift',
  'HybridOneDataScanner.swift',
]
  .map((file) =>
    readFileSync(resolve(root, 'ios/Nitro', file), 'utf8').replace(
      'import NitroModules\n',
      ''
    )
  )
  .join('\n')
const spec = readFileSync(
  resolve(root, 'nitrogen/generated/ios/swift/HybridOneDataScannerSpec.swift'),
  'utf8'
)
const protocol = spec
  .slice(spec.indexOf('public protocol'), spec.indexOf('public extension'))
  .replace(': HybridObject', '')
const source = `
import Foundation
import UIKit
import VisionKit
public enum RuntimeError: Error { case error(withMessage: String) }
public final class ArrayBuffer { static func copy(data: Data) throws -> ArrayBuffer { ArrayBuffer() } }
public struct DocumentCameraError { let domain: String; let code: Double; let localizedDescription: String }
public struct DocumentCameraImageSize { let width: Double; let height: Double }
class HybridOneDocumentCameraSpec { init() {} }
protocol HybridDocumentCameraScanSpec_protocol {}
class HybridDocumentCameraScanSpec_base { init() {} }
typealias HybridDocumentCameraScanSpec = HybridDocumentCameraScanSpec_protocol & HybridDocumentCameraScanSpec_base
public protocol HybridDocumentCameraImageSpec_protocol {}
public class HybridDocumentCameraImageSpec_base { init() {} }
public typealias HybridDocumentCameraImageSpec = HybridDocumentCameraImageSpec_protocol & HybridDocumentCameraImageSpec_base
public enum DataScannerItemType { case text, barcode }
public enum DataScannerQualityLevel { case balanced, fast, accurate }
public enum DataScannerTextContentType { case datetimeduration, emailaddress, flightnumber, fullstreetaddress, shipmenttrackingnumber, telephonenumber, url, currency }
public enum DataScannerScanningUnavailable { case unsupported, camerarestricted }
public struct DataScannerRecognizedDataType { let type: DataScannerItemType; let languages: [String]?; let textContentType: DataScannerTextContentType?; let symbologies: [String]? }
public struct DataScannerConfiguration { let recognizedDataTypes: [DataScannerRecognizedDataType]; let qualityLevel: DataScannerQualityLevel; let recognizesMultipleItems: Bool; let isHighFrameRateTrackingEnabled: Bool; let isPinchToZoomEnabled: Bool; let isGuidanceEnabled: Bool; let isHighlightingEnabled: Bool }
public struct DataScannerPoint { let x: Double; let y: Double }
public struct DataScannerRect { let x: Double; let y: Double; let width: Double; let height: Double }
public struct DataScannerBounds { let topLeft: DataScannerPoint; let topRight: DataScannerPoint; let bottomRight: DataScannerPoint; let bottomLeft: DataScannerPoint }
public struct DataScannerRecognizedItem { let type: DataScannerItemType; let id: String; let bounds: DataScannerBounds; let transcript: String?; let payloadStringValue: String? }
${protocol}
class HybridOneDataScannerSpec_base { init() {} }
typealias HybridOneDataScannerSpec = HybridOneDataScannerSpec_protocol & HybridOneDataScannerSpec_base
func oneNativeError(_ code: String, _ message: String) -> Error { NSError(domain: code, code: 1, userInfo: [NSLocalizedDescriptionKey: code + ": " + message]) }
func oneNativePresentingViewController() -> UIViewController? { UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }.flatMap(\\.windows).first?.rootViewController }
${promise}
${production}
@main final class App: UIResponder, UIApplicationDelegate {
  func application(_ application: UIApplication, configurationForConnecting session: UISceneSession, options: UIScene.ConnectionOptions) -> UISceneConfiguration {
    let config = UISceneConfiguration(name: "Proof", sessionRole: session.role); config.delegateClass = Scene.self; return config
  }
}
final class Scene: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?
  var scanner: HybridOneDataScanner?
  func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options: UIScene.ConnectionOptions) {
    window = UIWindow(windowScene: scene as! UIWindowScene)
    let root = UIViewController(); root.view.backgroundColor = .systemBackground
    window?.rootViewController = root; window?.makeKeyAndVisible()
    let scanner = HybridOneDataScanner(); self.scanner = scanner
    print("CAPABILITIES: supported=\\(scanner.isSupported) available=\\(scanner.isAvailable) scanning=\\(scanner.isScanning)"); fflush(stdout)
    precondition(!scanner.isSupported && scanner.isAvailable && !scanner.isScanning)
    let configuration = DataScannerConfiguration(recognizedDataTypes: [], qualityLevel: .balanced, recognizesMultipleItems: false, isHighFrameRateTrackingEnabled: true, isPinchToZoomEnabled: true, isGuidanceEnabled: true, isHighlightingEnabled: false)
    try! scanner.configure(configuration: configuration)
    do { try scanner.configure(configuration: configuration); fatalError("mutable initializer") }
    catch { precondition((error as NSError).domain == "E_DATA_SCANNER_CONFIGURED") }
    scanner.regionOfInterest = DataScannerRect(x: 3, y: 4, width: 100, height: 200)
    precondition(scanner.regionOfInterest?.width == 100); scanner.regionOfInterest = nil
    precondition(scanner.regionOfInterest == nil)
    try! scanner.stopScanning(); precondition(!scanner.isScanning)
    do { try scanner.startScanning(); fatalError("unsupported scanning") }
    catch { precondition((error as NSError).domain == "E_DATA_SCANNER_UNSUPPORTED") }
    do { _ = try scanner.subscribeRecognizedItems(onItems: { _ in fatalError("fake items") }, onEnd: {}); fatalError("unsupported stream") }
    catch { precondition((error as NSError).domain == "E_DATA_SCANNER_UNSUPPORTED") }
    let presentation = try! scanner.present(animated: false)
    presentation.then { fatalError("unsupported presentation") }.catch { error in
      precondition((error as NSError).domain == "E_DATA_SCANNER_UNSUPPORTED" && root.presentedViewController == nil)
      let photo = try! scanner.capturePhoto()
      photo.then { _ in fatalError("fake photo") }.catch { error in
        precondition((error as NSError).domain == "E_DATA_SCANNER_UNSUPPORTED" && !scanner.isScanning)
        let label = UILabel(frame: root.view.bounds.insetBy(dx: 28, dy: 90))
        label.numberOfLines = 0; label.font = .systemFont(ofSize: 25); label.textColor = .label
        label.text = "VisionKit data scanner\\n\\nSDK support: false\\nCamera available: true\\nScanning: false\\n\\nPASS\\nInitializer immutable\\nRegion set and cleared\\nStart rejected\\nPresent rejected\\nStream rejected\\nPhoto rejected\\nNo controller presented\\n\\nLive scan requires hardware"
        root.view.addSubview(label); root.view.layoutIfNeeded()
        let capture = UIGraphicsImageRenderer(bounds: root.view.bounds).image { _ in root.view.drawHierarchy(in: root.view.bounds, afterScreenUpdates: true) }
        try! capture.pngData()!.write(to: URL.documentsDirectory.appendingPathComponent("native.png"))
        print("PASS: actual VisionKit unsupported with available camera; production configure immutability, region set/clear, stop idle, start/present/stream/photo rejection; no presented controller or fake items. Physical scan and generated ABI pending.")
        exit(0)
      }
    }
  }
}
`
writeFileSync(resolve(output, 'Proof.swift'), source)
writeFileSync(
  resolve(app, 'Info.plist'),
  `<?xml version="1.0" encoding="UTF-8"?><plist version="1.0"><dict><key>CFBundleIdentifier</key><string>dev.one.data-scanner-proof</string><key>CFBundleExecutable</key><string>DataScannerProof</string><key>CFBundleName</key><string>DataScannerProof</string><key>CFBundlePackageType</key><string>APPL</string><key>CFBundleVersion</key><string>1</string><key>CFBundleShortVersionString</key><string>1.0</string><key>MinimumOSVersion</key><string>17.0</string><key>NSCameraUsageDescription</key><string>Data scanner native proof</string><key>UIApplicationSceneManifest</key><dict><key>UIApplicationSupportsMultipleScenes</key><false/><key>UISceneConfigurations</key><dict/></dict><key>UILaunchScreen</key><dict/></dict></plist>`
)
const sdk = execFileSync('xcrun', ['--sdk', 'iphonesimulator', '--show-sdk-path'], {
  encoding: 'utf8',
}).trim()
execFileSync(
  'xcrun',
  [
    'swiftc',
    '-parse-as-library',
    '-swift-version',
    '5',
    '-sdk',
    sdk,
    '-target',
    'arm64-apple-ios17.0-simulator',
    resolve(output, 'Proof.swift'),
    '-o',
    resolve(app, 'DataScannerProof'),
  ],
  { stdio: 'inherit' }
)
execFileSync('codesign', ['--force', '--sign', '-', app], { stdio: 'inherit' })
execFileSync(
  'xcodebuildmcp',
  ['simulator', 'install', '--simulator-id', udid, '--app-path', app],
  { stdio: 'inherit' }
)
const result = execFileSync(
  'xcrun',
  ['simctl', 'launch', '--console', udid, 'dev.one.data-scanner-proof'],
  { encoding: 'utf8' }
)
if (!result.includes('PASS: actual VisionKit unsupported'))
  throw new Error(`Native proof failed: ${result}`)
console.log(result.trim())

const container = execFileSync(
  'xcrun',
  ['simctl', 'get_app_container', udid, 'dev.one.data-scanner-proof', 'data'],
  { encoding: 'utf8' }
).trim()
await sharp(resolve(container, 'Documents/native.png'))
  .webp({ quality: 90 })
  .toFile(resolve(output, 'native.webp'))
const metadata = await sharp(resolve(output, 'native.webp')).metadata()
console.log(`capture: ${metadata.width}x${metadata.height}`)
