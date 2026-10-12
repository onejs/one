import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

// runs production controller code against UIKit/VisionKit. transport shims isolate
// this probe from pods; native-features CI separately validates the generated ABI.
const udid = process.env.SIMULATOR_UDID
if (!udid) throw new Error('set SIMULATOR_UDID to a claimed iOS 27 simulator')
const output = process.env.DOCUMENT_CAMERA_PROOF_DIR ?? '/tmp/one-document-camera-proof'
const app = resolve(output, 'DocumentCameraProof.app')
mkdirSync(app, { recursive: true })
const bridge = readFileSync(
  resolve(
    import.meta.dir,
    '../../../packages/one/ios/Nitro/HybridOneDocumentCamera.swift'
  ),
  'utf8'
).replace('import NitroModules\n', '')
const shims = `
import Foundation
import UIKit
class Promise<T> {
  var success: ((T) -> Void)?
  var failure: ((Error) -> Void)?
  func resolve(withResult result: T) { success?(result) }
  func reject(withError error: Error) { failure?(error) }
}
class ArrayBuffer {
  let data: Data
  init(_ data: Data) { self.data = data }
  static func copy(data: Data) throws -> ArrayBuffer { ArrayBuffer(data) }
}
struct DocumentCameraError { let domain: String; let code: Double; let localizedDescription: String }
struct DocumentCameraImageSize { let width: Double; let height: Double }
class HybridOneDocumentCameraSpec { init() {} }
class HybridDocumentCameraScanSpec { init() {} }
class HybridDocumentCameraImageSpec { init() {} }
func oneNativeError(_ code: String, _ message: String) -> Error {
  NSError(domain: code, code: 1, userInfo: [NSLocalizedDescriptionKey: code + ": " + message])
}
func oneNativePresentingViewController() -> UIViewController? {
  UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }.flatMap(\\.windows).first?.rootViewController
}
`
// shims use protocols for the two scan/image return existential types.
const source =
  shims
    .replace(
      'class HybridDocumentCameraScanSpec { init() {} }',
      'protocol HybridDocumentCameraScanSpec_protocol {}\nclass HybridDocumentCameraScanSpec_base { init() {} }\ntypealias HybridDocumentCameraScanSpec = HybridDocumentCameraScanSpec_protocol & HybridDocumentCameraScanSpec_base'
    )
    .replace(
      'class HybridDocumentCameraImageSpec { init() {} }',
      'protocol HybridDocumentCameraImageSpec_protocol {}\nclass HybridDocumentCameraImageSpec_base { init() {} }\ntypealias HybridDocumentCameraImageSpec = HybridDocumentCameraImageSpec_protocol & HybridDocumentCameraImageSpec_base'
    ) +
  bridge +
  `
@main final class App: UIResponder, UIApplicationDelegate {
  func application(_ application: UIApplication, configurationForConnecting session: UISceneSession, options: UIScene.ConnectionOptions) -> UISceneConfiguration {
    let config = UISceneConfiguration(name: "Proof", sessionRole: session.role)
    config.delegateClass = Scene.self
    return config
  }
}
final class Scene: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?
  var camera: HybridOneDocumentCamera?
  func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options: UIScene.ConnectionOptions) {
    window = UIWindow(windowScene: scene as! UIWindowScene)
    let root = UIViewController()
    root.view.backgroundColor = .systemBackground
    window?.rootViewController = root
    window?.makeKeyAndVisible()
    let camera = HybridOneDocumentCamera()
    self.camera = camera
    precondition(!camera.isSupported, "requires simulator unavailability")
    let promise = try! camera.present(animated: false, didFinish: { _ in fatalError("unexpected scan") }, didCancel: { fatalError("unexpected cancel") }, didFail: { _ in fatalError("unexpected delegate failure") })
    promise.success = { _ in fatalError("unavailable camera presented") }
    promise.failure = { error in
      precondition((error as NSError).domain == "E_DOCUMENT_CAMERA_UNSUPPORTED")
      precondition(root.presentedViewController == nil)
      let renderer = UIGraphicsImageRenderer(size: CGSize(width: 3, height: 2))
      let image = HybridDocumentCameraImage(renderer.image { context in UIColor.red.setFill(); context.fill(CGRect(x: 0, y: 0, width: 3, height: 2)) })
      precondition(image.size.width == 3 && image.size.height == 2)
      precondition(try! image.pngData()!.data.count > 0)
      precondition(try! image.jpegData(compressionQuality: 0.8)!.data.count > 0)
      for bad in [-1.0, 1.1, Double.nan, Double.infinity] {
        do { _ = try image.jpegData(compressionQuality: bad); fatalError("invalid quality accepted") }
        catch { precondition((error as NSError).domain == "E_DOCUMENT_CAMERA_QUALITY") }
      }
      let result = "PASS: isSupported=false; production present rejected E_DOCUMENT_CAMERA_UNSUPPORTED; no controller presented; image encoding and invalid quality checked. Physical scan success pending."
      let label = UILabel(frame: CGRect(x: 20, y: 100, width: 350, height: 500))
      label.numberOfLines = 0; label.text = result; root.view.addSubview(label)
      print(result)
      try! result.write(to: URL(fileURLWithPath: NSHomeDirectory()).appendingPathComponent("Documents/result.txt"), atomically: true, encoding: .utf8)
      exit(0)
    }
  }
}
`
writeFileSync(resolve(output, 'Proof.swift'), source)
writeFileSync(
  resolve(app, 'Info.plist'),
  `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"><plist version="1.0"><dict><key>CFBundleIdentifier</key><string>dev.one.document-camera-proof</string><key>CFBundleExecutable</key><string>DocumentCameraProof</string><key>CFBundleName</key><string>DocumentCameraProof</string><key>CFBundlePackageType</key><string>APPL</string><key>CFBundleVersion</key><string>1</string><key>CFBundleShortVersionString</key><string>1.0</string><key>LSRequiresIPhoneOS</key><true/><key>MinimumOSVersion</key><string>17.0</string><key>NSCameraUsageDescription</key><string>Document camera native proof</string><key>UIApplicationSceneManifest</key><dict><key>UIApplicationSupportsMultipleScenes</key><false/><key>UISceneConfigurations</key><dict/></dict><key>UILaunchScreen</key><dict/></dict></plist>`
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
    resolve(app, 'DocumentCameraProof'),
  ],
  { stdio: 'inherit' }
)
execFileSync('codesign', ['--force', '--sign', '-', app], { stdio: 'inherit' })
execFileSync('xcrun', ['simctl', 'install', udid, app], { stdio: 'inherit' })
const result = execFileSync(
  'xcrun',
  ['simctl', 'launch', '--console', udid, 'dev.one.document-camera-proof'],
  { encoding: 'utf8' }
)
if (
  !result.includes(
    'PASS: isSupported=false; production present rejected E_DOCUMENT_CAMERA_UNSUPPORTED'
  )
) {
  throw new Error(`Native proof failed: ${result}`)
}
console.log(result.trim())
console.log('Generated ABI and physical scan gates remain open.')
