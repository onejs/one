import Contacts
import ContactsUI
import NitroModules
import UIKit

final class HybridNativeCNContact: HybridNativeCNContactSpec {
  let value: CNContact
  init(_ value: CNContact = CNMutableContact()) { self.value = value; super.init() }
  var identifier: String { oneUIKitOnMain { value.identifier } }
  func isKeyAvailable(key: String) throws -> Bool { oneUIKitOnMain { value.isKeyAvailable(key) } }
  func getName(key: ContactUINameKey) throws -> String {
    try oneUIKitOnMain {
      let name = Self.nameKey(key)
      guard value.isKeyAvailable(name) else { throw oneNativeError("E_CONTACT_UI_KEY", "Contact property was not fetched: \(name)") }
      switch key {
      case .nameprefix: return value.namePrefix
      case .givenname: return value.givenName
      case .middlename: return value.middleName
      case .familyname: return value.familyName
      case .namesuffix: return value.nameSuffix
      case .nickname: return value.nickname
      case .organizationname: return value.organizationName
      case .jobtitle: return value.jobTitle
      }
    }
  }
  func mutableCopy() throws -> any HybridNativeCNContactSpec {
    oneUIKitOnMain { HybridNativeCNContact(value.mutableCopy() as! CNMutableContact) }
  }
  func setName(key: ContactUINameKey, value: String) throws {
    try oneUIKitOnMain {
      guard let contact = self.value as? CNMutableContact else { throw oneNativeError("E_CONTACT_UI_IMMUTABLE", "Use CNContact.mutableCopy() before changing values") }
      guard contact.isKeyAvailable(Self.nameKey(key)) else { throw oneNativeError("E_CONTACT_UI_KEY", "Contact property was not fetched") }
      switch key {
      case .nameprefix: contact.namePrefix = value
      case .givenname: contact.givenName = value
      case .middlename: contact.middleName = value
      case .familyname: contact.familyName = value
      case .namesuffix: contact.nameSuffix = value
      case .nickname: contact.nickname = value
      case .organizationname: contact.organizationName = value
      case .jobtitle: contact.jobTitle = value
      }
    }
  }
  private static func nameKey(_ key: ContactUINameKey) -> String {
    switch key {
    case .nameprefix: return CNContactNamePrefixKey
    case .givenname: return CNContactGivenNameKey
    case .middlename: return CNContactMiddleNameKey
    case .familyname: return CNContactFamilyNameKey
    case .namesuffix: return CNContactNameSuffixKey
    case .nickname: return CNContactNicknameKey
    case .organizationname: return CNContactOrganizationNameKey
    case .jobtitle: return CNContactJobTitleKey
    }
  }
}
final class HybridNativeCNKeyDescriptor: HybridNativeCNKeyDescriptorSpec {
  let value: any CNKeyDescriptor
  init(_ value: any CNKeyDescriptor) { self.value = value; super.init() }
  var hash: Double { Double(value.hash) }
}
final class HybridNativeCNContactStore: HybridNativeCNContactStoreSpec {
  let value: CNContactStore
  init(_ value: CNContactStore = CNContactStore()) { self.value = value; super.init() }
  func unifiedContact(withIdentifier: String, keys: [String], descriptors: [any HybridNativeCNKeyDescriptorSpec]) throws -> Promise<any HybridNativeCNContactSpec> {
    let promise = Promise<any HybridNativeCNContactSpec>()
    DispatchQueue.global(qos: .userInitiated).async {
      do {
        guard let usage = Bundle.main.object(forInfoDictionaryKey: "NSContactsUsageDescription") as? String,
          !usage.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
          throw oneNativeError("E_CONTACT_UI_MANIFEST", "Set ios.infoPlist.NSContactsUsageDescription")
        }
        var fetchedKeys: [any CNKeyDescriptor] = keys.map { $0 as NSString }
        for descriptor in descriptors {
          guard let descriptor = descriptor as? HybridNativeCNKeyDescriptor else { throw oneNativeError("E_CONTACT_UI_DESCRIPTOR", "Requires a native CNKeyDescriptor") }
          fetchedKeys.append(descriptor.value)
        }
        let contact = try self.value.unifiedContact(withIdentifier: withIdentifier, keysToFetch: fetchedKeys)
        promise.resolve(withResult: HybridNativeCNContact(contact))
      } catch { promise.reject(withError: error) }
    }
    return promise
  }
}
final class HybridOneContactUI: HybridOneContactUISpec {
  private var controller: CNContactViewController?
  private var navigation: UINavigationController?
  private var storedContact: HybridNativeCNContact?
  private var storedStore: HybridNativeCNContactStore?
  private let presentation = OneUIKitPresentation()
  private let delegate = OneContactUIDelegate()
  fileprivate var completion: (((any HybridNativeCNContactSpec)?) -> Void)?
  override init() {
    super.init(); delegate.owner = self
    presentation.onDismiss = { [weak self] in self?.completion = nil }
  }
  func descriptorForRequiredKeys() throws -> any HybridNativeCNKeyDescriptorSpec {
    oneUIKitOnMain { HybridNativeCNKeyDescriptor(CNContactViewController.descriptorForRequiredKeys()) }
  }
  func configure(mode: ContactUIMode, contact: (any HybridNativeCNContactSpec)?) throws {
    try oneUIKitOnMain {
      guard controller == nil else { throw oneNativeError("E_CONTACT_UI_CONFIGURED", "Contact controller initializer is immutable") }
      let native: CNContact?
      if let contact {
        guard let wrapped = contact as? HybridNativeCNContact else { throw oneNativeError("E_CONTACT_UI_CONTACT", "Requires a native CNContact") }
        native = wrapped.value
      } else { native = nil }
      if let native, !native.areKeysAvailable([CNContactViewController.descriptorForRequiredKeys()]) {
        throw oneNativeError("E_CONTACT_UI_KEYS", "Fetch descriptorForRequiredKeys before displaying a contact")
      }
      let result: CNContactViewController
      switch mode {
      case .contact:
        guard let native else {
          throw oneNativeError("E_CONTACT_UI_KEYS", "Existing contact requires a native CNContact")
        }
        result = CNContactViewController(for: native)
      case .unknowncontact:
        guard let native else { throw oneNativeError("E_CONTACT_UI_CONTACT", "Unknown contact requires a CNContact") }
        result = CNContactViewController(forUnknownContact: native)
      case .newcontact: result = CNContactViewController(forNewContact: native)
      }
      result.delegate = delegate
      controller = result
      navigation = UINavigationController(rootViewController: result)
    }
  }
  var contact: any HybridNativeCNContactSpec {
    oneUIKitOnMain {
      precondition(controller != nil, "initialize contact controller first")
      let contact = controller!.contact
      if let storedContact, storedContact.value === contact { return storedContact }
      let wrapped = HybridNativeCNContact(contact); storedContact = wrapped; return wrapped
    }
  }
  var displayedPropertyKeys: [String]? {
    get { oneUIKitOnMain { controller?.displayedPropertyKeys as? [String] } }
    set { oneUIKitOnMain { controller?.displayedPropertyKeys = newValue } }
  }
  func getContactStore() throws -> (any HybridNativeCNContactStoreSpec)? {
    oneUIKitOnMain {
      guard let store = controller?.contactStore else { return nil }
      if let storedStore, storedStore.value === store { return storedStore }
      let wrapped = HybridNativeCNContactStore(store); storedStore = wrapped; return wrapped
    }
  }
  func setContactStore(store: (any HybridNativeCNContactStoreSpec)?) throws {
    try oneUIKitOnMain {
      if let store {
        guard let wrapped = store as? HybridNativeCNContactStore else { throw oneNativeError("E_CONTACT_UI_STORE", "Requires a native CNContactStore") }
        controller?.contactStore = wrapped.value; storedStore = wrapped
      } else { controller?.contactStore = nil; storedStore = nil }
    }
  }
  var alternateName: String? {
    get { oneUIKitOnMain { controller?.alternateName } }
    set { oneUIKitOnMain { controller?.alternateName = newValue } }
  }
  var message: String? {
    get { oneUIKitOnMain { controller?.message } }
    set { oneUIKitOnMain { controller?.message = newValue } }
  }
  var allowsEditing: Bool {
    get { oneUIKitOnMain { controller?.allowsEditing ?? false } }
    set { oneUIKitOnMain { controller?.allowsEditing = newValue } }
  }
  var allowsActions: Bool {
    get { oneUIKitOnMain { controller?.allowsActions ?? false } }
    set { oneUIKitOnMain { controller?.allowsActions = newValue } }
  }
  var shouldShowLinkedContacts: Bool {
    get { oneUIKitOnMain { controller?.shouldShowLinkedContacts ?? false } }
    set { oneUIKitOnMain { controller?.shouldShowLinkedContacts = newValue } }
  }
  func highlightProperty(withKey: String, identifier: String?) throws { oneUIKitOnMain { controller?.highlightProperty(withKey: withKey, identifier: identifier) } }
  func present(animated: Bool, didComplete: @escaping ((any HybridNativeCNContactSpec)?) -> Void) throws -> Promise<Void> {
    let promise = Promise<Void>()
    DispatchQueue.main.async {
      do {
        guard let navigation = self.navigation else { throw oneNativeError("E_CONTACT_UI_CONFIGURATION", "Initialize a contact controller first") }
        guard let usage = Bundle.main.object(forInfoDictionaryKey: "NSContactsUsageDescription") as? String,
          !usage.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { throw oneNativeError("E_CONTACT_UI_MANIFEST", "Set ios.infoPlist.NSContactsUsageDescription") }
        let presented = try self.presentation.present(navigation, owner: self, animated: animated)
        self.completion = didComplete
        presented.then { promise.resolve(withResult: ()) }.catch { promise.reject(withError: $0) }
      } catch { promise.reject(withError: error) }
    }
    return promise
  }
  func dismiss(animated: Bool) throws -> Promise<Void> {
    try oneUIKitOnMain {
      let result = try presentation.dismiss(animated: animated)
      result.then { self.completion = nil }
      return result
    }
  }
  fileprivate func finish(_ contact: CNContact?) {
    let callback = completion; completion = nil
    callback?(contact.map { HybridNativeCNContact($0) })
  }
}
final class OneContactUIDelegate: NSObject, CNContactViewControllerDelegate {
  weak var owner: HybridOneContactUI?
  func contactViewController(_ viewController: CNContactViewController, didCompleteWith contact: CNContact?) { owner?.finish(contact) }
}
