import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

// uses the installed Nitro Promise implementation and production MessageUI code.
// generated C++ ABI is validated by native-features CI, outside this SDK probe.
const udid = process.env.SIMULATOR_UDID
if (!udid) throw new Error('set SIMULATOR_UDID to a claimed iOS 27 simulator')
const output = '/tmp/one-message-ui-proof'
const app = resolve(output, 'MessageUIProof.app')
mkdirSync(app, { recursive: true })
const promise = readFileSync(
  resolve(
    import.meta.dir,
    '../../../node_modules/react-native-nitro-modules/ios/core/Promise.swift'
  ),
  'utf8'
)
const production = [
  'OneUIKitPresentation.swift',
  'HybridOneMailCompose.swift',
  'HybridOneMessageCompose.swift',
]
  .map((file) =>
    readFileSync(
      resolve(import.meta.dir, '../../../packages/one/ios/Nitro', file),
      'utf8'
    ).replace('import NitroModules\n', '')
  )
  .join('\n')
const source = `
import Foundation
import UIKit
import MessageUI
public enum RuntimeError: Error { case error(withMessage: String) }
public final class ArrayBuffer {
  let data: Data
  init(_ data: Data) { self.data = data }
  func toData(copyIfNeeded: Bool) -> Data { data }
}
public struct DocumentCameraError { let domain: String; let code: Double; let localizedDescription: String }
public struct MessageAttachment { let attachmentURL: String; let attachmentAlternateFilename: String? }
public enum MailComposeResult { case cancelled, saved, sent, failed }
public enum MessageComposeResult { case cancelled, sent, failed }
class HybridOneMailComposeSpec { init() {} }
class HybridOneMessageComposeSpec { init() {} }
func oneNativeError(_ code: String, _ message: String) -> Error {
  NSError(domain: code, code: 1, userInfo: [NSLocalizedDescriptionKey: code + ": " + message])
}
func oneNativePresentingViewController() -> UIViewController? {
  UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }.flatMap(\\.windows).first?.rootViewController
}
${promise}
${production}
@main final class App: UIResponder, UIApplicationDelegate {
  func application(_ application: UIApplication, configurationForConnecting session: UISceneSession, options: UIScene.ConnectionOptions) -> UISceneConfiguration {
    let config = UISceneConfiguration(name: "Proof", sessionRole: session.role); config.delegateClass = Scene.self; return config
  }
}
final class Scene: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?
  var mail: HybridOneMailCompose?
  var message: HybridOneMessageCompose?
  func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options: UIScene.ConnectionOptions) {
    window = UIWindow(windowScene: scene as! UIWindowScene)
    let root = UIViewController(); root.view.backgroundColor = .systemBackground
    window?.rootViewController = root; window?.makeKeyAndVisible()
    let mail = HybridOneMailCompose(); self.mail = mail
    let message = HybridOneMessageCompose(); self.message = message
    precondition(try! !mail.canSendMail())
    precondition(try! !message.canSendText())
    message.recipients = ["12345"]; message.body = "draft"; message.subject = "subject"
    precondition(message.recipients == ["12345"] && message.body == "draft" && message.subject == "subject")
    message.recipients = nil; message.body = nil; message.subject = nil
    precondition(message.recipients == nil && message.body == nil && message.subject == nil)
    precondition(message.attachments.isEmpty)
    precondition(try! !message.addAttachmentURL(attachmentURL: "https://example.com/a.jpg", withAlternateFilename: nil))
    var canceled = 0
    mail.completion = { result, error in precondition(result == .cancelled && error == nil); canceled += 1 }
    mail.finish(.cancelled, nil); mail.finish(.cancelled, nil)
    precondition(canceled == 1)
    var mappedError = false
    mail.completion = { result, error in precondition(result == .failed); mappedError = error?.domain == "probe" && error?.code == 7 }
    mail.finish(.failed, NSError(domain: "probe", code: 7))
    precondition(mappedError)
    var finished = 0
    message.completion = { result in precondition(result == .cancelled); finished += 1 }
    message.finish(.cancelled); message.finish(.cancelled)
    precondition(finished == 1)
    let mailPromise = try! mail.present(animated: false, didFinish: { _, _ in fatalError("unexpected mail result") })
    mailPromise.then { fatalError("unavailable mail presented") }.catch { error in
      precondition((error as NSError).domain == "E_MAIL_COMPOSE_UNAVAILABLE")
      let messagePromise = try! message.present(animated: false, didFinish: { _ in fatalError("unexpected message result") })
      messagePromise.then { fatalError("unavailable message presented") }.catch { error in
        precondition((error as NSError).domain == "E_MESSAGE_COMPOSE_UNAVAILABLE")
        precondition(root.presentedViewController == nil)
        print("PASS: actual MessageUI capabilities false; production mail/message presentation rejected; draft set/clear and attachments negative; completion once and NSError mapping. Supported device compose/send pending.")
        exit(0)
      }
    }
  }
}
`
writeFileSync(resolve(output, 'Proof.swift'), source)
writeFileSync(
  resolve(app, 'Info.plist'),
  `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"><plist version="1.0"><dict><key>CFBundleIdentifier</key><string>dev.one.message-ui-proof</string><key>CFBundleExecutable</key><string>MessageUIProof</string><key>CFBundleName</key><string>MessageUIProof</string><key>CFBundlePackageType</key><string>APPL</string><key>CFBundleVersion</key><string>1</string><key>CFBundleShortVersionString</key><string>1.0</string><key>LSRequiresIPhoneOS</key><true/><key>MinimumOSVersion</key><string>17.0</string><key>UIApplicationSceneManifest</key><dict><key>UIApplicationSupportsMultipleScenes</key><false/><key>UISceneConfigurations</key><dict/></dict><key>UILaunchScreen</key><dict/></dict></plist>`
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
    resolve(app, 'MessageUIProof'),
  ],
  { stdio: 'inherit' }
)
execFileSync('codesign', ['--force', '--sign', '-', app], { stdio: 'inherit' })
execFileSync('xcrun', ['simctl', 'install', udid, app], { stdio: 'inherit' })
const result = execFileSync(
  'xcrun',
  ['simctl', 'launch', '--console', udid, 'dev.one.message-ui-proof'],
  { encoding: 'utf8' }
)
if (!result.includes('PASS: actual MessageUI capabilities false'))
  throw new Error(`Native proof failed: ${result}`)
console.log(result.trim())
