import { execFileSync, spawn } from 'node:child_process'
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
} from 'node:fs'
import { resolve } from 'node:path'
import sharp from 'sharp'

// production ContactsUI with actual SDK actions; generated protocol contracts and Nitro Promise.
// transport-only classes replace generated C++ wrappers; full ABI remains a CI gate.
const udid = process.env.SIMULATOR_UDID
if (!udid) throw new Error('set SIMULATOR_UDID to a claimed iOS 27 simulator')
const output = '/tmp/one-contact-ui-proof'
const app = resolve(output, 'ContactUIProof.app')
mkdirSync(app, { recursive: true })
const root = resolve(import.meta.dir, '../../../packages/one')
const promise = readFileSync(
  resolve(
    import.meta.dir,
    '../../../node_modules/react-native-nitro-modules/ios/core/Promise.swift'
  ),
  'utf8'
)
const specs = [
  'NativeCNContact',
  'NativeCNKeyDescriptor',
  'NativeCNContactStore',
  'OneContactUI',
]
  .map((name) => {
    const text = readFileSync(
      resolve(root, `nitrogen/generated/ios/swift/Hybrid${name}Spec.swift`),
      'utf8'
    )
    return (
      text
        .slice(text.indexOf('public protocol'), text.indexOf('public extension'))
        .replace(': HybridObject', '') +
      `\npublic class Hybrid${name}Spec_base { public init() {} }\npublic typealias Hybrid${name}Spec = Hybrid${name}Spec_protocol & Hybrid${name}Spec_base\n`
    )
  })
  .join('\n')
const production = ['OneUIKitPresentation.swift', 'HybridOneContactUI.swift']
  .map((file) =>
    readFileSync(resolve(root, 'ios/Nitro', file), 'utf8').replace(
      'import NitroModules\n',
      ''
    )
  )
  .join('\n')
const source = `
import Foundation
import UIKit
import Contacts
import ContactsUI
public enum RuntimeError: Error { case error(withMessage: String) }
public enum ContactUINameKey { case nameprefix, givenname, middlename, familyname, namesuffix, nickname, organizationname, jobtitle }
public enum ContactUIMode { case contact, unknowncontact, newcontact }
${specs}
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
  let root = UIViewController()
  let store = HybridNativeCNContactStore()
  var controllers: [HybridOneContactUI] = []
  var ownedIDs: [String] = []
  var canceled = 0
  var saved = 0
  func capture(_ name: String) {
    window!.layoutIfNeeded()
    let image = UIGraphicsImageRenderer(bounds: window!.bounds).image { _ in window!.drawHierarchy(in: window!.bounds, afterScreenUpdates: true) }
    try! image.pngData()!.write(to: URL.documentsDirectory.appendingPathComponent(name + ".png"))
  }
  func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options: UIScene.ConnectionOptions) {
    window = UIWindow(windowScene: scene as! UIWindowScene); root.view.backgroundColor = .systemBackground
    window?.rootViewController = root; window?.makeKeyAndVisible()
    precondition(CNContactStore.authorizationStatus(for: .contacts) == .authorized)
    let mutable = HybridNativeCNContact()
    try! mutable.setName(key: .givenname, value: "UIKit")
    try! mutable.setName(key: .familyname, value: "Stored proof")
    let copy = try! mutable.mutableCopy()
    try! copy.setName(key: .givenname, value: "Copy")
    precondition(try! mutable.getName(key: .givenname) == "UIKit")
    let seed = mutable.value as! CNMutableContact
    let request = CNSaveRequest(); request.add(seed, toContainerWithIdentifier: nil); try! store.value.execute(request)
    ownedIDs.append(seed.identifier)
    try! store.unifiedContact(withIdentifier: seed.identifier, keys: [CNContactIdentifierKey], descriptors: []).then { partial in
      precondition(try! !partial.isKeyAvailable(key: CNContactPhoneNumbersKey))
      do { _ = try partial.getName(key: .jobtitle); fatalError("unfetched property read") }
      catch { precondition((error as NSError).domain == "E_CONTACT_UI_KEY") }
      for mode: ContactUIMode in [.contact, .unknowncontact, .newcontact] {
        let invalid = HybridOneContactUI()
        do { try invalid.configure(mode: mode, contact: partial); fatalError("incomplete contact displayed") }
        catch { precondition((error as NSError).domain == "E_CONTACT_UI_KEYS") }
      }
      let known = HybridOneContactUI(); self.controllers.append(known)
      let descriptor = try! known.descriptorForRequiredKeys()
      try! self.store.unifiedContact(withIdentifier: seed.identifier, keys: [], descriptors: [descriptor]).then { fetched in
        try! known.configure(mode: .contact, contact: fetched)
        known.allowsEditing = false; known.allowsActions = false; known.shouldShowLinkedContacts = false
        known.displayedPropertyKeys = [CNContactGivenNameKey, CNContactFamilyNameKey]
        known.alternateName = "Alternate"; known.message = "Native ContactsUI proof"
        precondition(!known.allowsEditing && !known.allowsActions && known.message == "Native ContactsUI proof")
        do { try known.configure(mode: .newcontact, contact: nil); fatalError("mutable initializer") }
        catch { precondition((error as NSError).domain == "E_CONTACT_UI_CONFIGURED") }
        try! known.present(animated: false, didComplete: { _ in fatalError("known read-only view completed") }).then {
          let navigation = self.root.presentedViewController as! UINavigationController
          let nativeView = navigation.topViewController as! CNContactViewController
          precondition(nativeView.contact.identifier == seed.identifier && !nativeView.allowsEditing)
          self.capture("known")
          try! known.dismiss(animated: false).then { self.showNew(save: false) }
        }.catch { fatalError("known presentation failed: \\($0)") }
      }.catch { fatalError("full fetch failed: \\($0)") }
    }.catch { fatalError("partial fetch failed: \\($0)") }
  }
  func showNew(save: Bool) {
    let controller = HybridOneContactUI(); controllers.append(controller)
    let draft = HybridNativeCNContact()
    try! draft.setName(key: .givenname, value: "UIKit")
    try! draft.setName(key: .familyname, value: save ? "Save proof" : "Cancel proof")
    try! controller.configure(mode: .newcontact, contact: draft)
    try! controller.setContactStore(store: store)
    precondition(try! controller.getContactStore() != nil)
    try! controller.present(animated: false, didComplete: { result in
      precondition(self.root.presentedViewController != nil)
      if save {
        guard let result else { fatalError("save returned nil") }
        self.saved += 1; self.ownedIDs.append(result.identifier)
        precondition(try! result.getName(key: .familyname) == "Save proof")
      } else { precondition(result == nil); self.canceled += 1 }
      controller.finish(nil)
      precondition(self.canceled == 1 && self.saved == (save ? 1 : 0))
      try! controller.dismiss(animated: false).then {
        if save { self.finish() } else { self.showNew(save: true) }
      }
    }).then {
      self.capture(save ? "save" : "cancel")
      print(save ? "READY:SAVE" : "READY:CANCEL"); fflush(stdout)
    }.catch { fatalError("new presentation failed: \\($0)") }
  }
  func finish() {
    for identifier in ownedIDs {
      let contact = try! store.value.unifiedContact(withIdentifier: identifier, keysToFetch: [CNContactIdentifierKey as CNKeyDescriptor])
      let request = CNSaveRequest(); request.delete(contact.mutableCopy() as! CNMutableContact); try! store.value.execute(request)
    }
    precondition(root.presentedViewController == nil && canceled == 1 && saved == 1)
    let result = "PASS: actual ContactsUI known mounted; real Cancel=nil and Save=stored CNContact; explicit dismissal, immutable initializer, mutable copy independence, missing-key rejection and one-shot completion; own contacts removed. Generated ABI pending."
    print(result); fflush(stdout)
    try! result.write(to: URL.documentsDirectory.appendingPathComponent("result.txt"), atomically: true, encoding: .utf8)
    exit(0)
  }
}
`
writeFileSync(resolve(output, 'Proof.swift'), source)
writeFileSync(
  resolve(app, 'Info.plist'),
  `<?xml version="1.0" encoding="UTF-8"?><plist version="1.0"><dict><key>CFBundleIdentifier</key><string>dev.one.contact-ui-proof</string><key>CFBundleExecutable</key><string>ContactUIProof</string><key>CFBundleName</key><string>ContactUIProof</string><key>CFBundlePackageType</key><string>APPL</string><key>CFBundleVersion</key><string>1</string><key>CFBundleShortVersionString</key><string>1.0</string><key>MinimumOSVersion</key><string>17.0</string><key>NSContactsUsageDescription</key><string>ContactsUI native proof</string><key>UIApplicationSceneManifest</key><dict><key>UIApplicationSupportsMultipleScenes</key><false/><key>UISceneConfigurations</key><dict/></dict><key>UILaunchScreen</key><dict/></dict></plist>`
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
    resolve(app, 'ContactUIProof'),
  ],
  { stdio: 'inherit' }
)
execFileSync('codesign', ['--force', '--sign', '-', app], { stdio: 'inherit' })
execFileSync(
  'xcodebuildmcp',
  ['simulator', 'install', '--simulator-id', udid, '--app-path', app],
  { stdio: 'inherit' }
)
execFileSync(
  'xcrun',
  ['simctl', 'privacy', udid, 'grant', 'contacts', 'dev.one.contact-ui-proof'],
  { stdio: 'inherit' }
)
const container = execFileSync(
  'xcrun',
  ['simctl', 'get_app_container', udid, 'dev.one.contact-ui-proof', 'data'],
  { encoding: 'utf8' }
).trim()
rmSync(resolve(container, 'Documents/result.txt'), { force: true })
const actionsOutput = mkdtempSync(resolve(output, 'actions-'))
const cancelFlow = resolve(output, 'cancel-ui.yaml')
const saveFlow = resolve(output, 'save-ui.yaml')
writeFileSync(
  cancelFlow,
  "appId: dev.one.contact-ui-proof\n---\n- tapOn: 'Cancel'\n- assertVisible: 'Discard Changes'\n- tapOn: 'Discard Changes'\n"
)
writeFileSync(
  saveFlow,
  `appId: dev.one.contact-ui-proof\n---\n- assertVisible: 'New Contact'\n- takeScreenshot: review-save\n- tapOn: 'Done'\n`
)
// event-driven UI actions; no polling. Maestro must be installed on PATH.
await new Promise<void>((resolveLaunch, reject) => {
  const child = spawn('xcrun', [
    'simctl',
    'launch',
    '--console',
    udid,
    'dev.one.contact-ui-proof',
  ])
  let pending = ''
  let actionError: unknown
  child.stdout.on('data', (chunk) => {
    process.stdout.write(chunk)
    pending += chunk.toString()
    let newline: number
    while ((newline = pending.indexOf('\n')) !== -1) {
      const line = pending.slice(0, newline)
      pending = pending.slice(newline + 1)
      if (line === 'READY:CANCEL' || line === 'READY:SAVE') {
        try {
          execFileSync(
            'maestro',
            [
              '--device',
              udid,
              'test',
              '--test-output-dir',
              resolve(actionsOutput, line === 'READY:CANCEL' ? 'cancel' : 'save'),
              line === 'READY:CANCEL' ? cancelFlow : saveFlow,
            ],
            { stdio: 'inherit' }
          )
        } catch (error) {
          actionError = error
          reject(error)
        }
      }
    }
  })
  child.stderr.on('data', (chunk) => process.stderr.write(chunk))
  child.on('error', reject)
  child.on('close', (code) =>
    code === 0 && !actionError
      ? resolveLaunch()
      : reject(actionError ?? new Error(`launch exited ${code}`))
  )
})
const result = readFileSync(resolve(container, 'Documents/result.txt'), 'utf8')
if (!result.startsWith('PASS: actual ContactsUI'))
  throw new Error('native proof did not complete')
for (const name of ['known', 'cancel', 'save']) {
  await sharp(resolve(container, `Documents/${name}.png`))
    .webp({ quality: 90 })
    .toFile(resolve(output, `${name}.webp`))
}
console.log(result)

const saveOutput = resolve(actionsOutput, 'save')
const screenshots = readdirSync(saveOutput, { recursive: true, encoding: 'utf8' }).filter(
  (path) => path.endsWith('takeScreenshot/review-save.png')
)
if (screenshots.length !== 1)
  throw new Error(`expected one fresh native screenshot, got ${screenshots.length}`)
await sharp(resolve(saveOutput, screenshots[0]))
  .webp({ quality: 90 })
  .toFile(resolve(output, 'review.webp'))
