import Contacts
import NitroModules

final class HybridOneContacts: HybridOneContactsSpec {
  func getPermissionStatus() throws -> ContactsPermissionStatus {
    Self.status(CNContactStore.authorizationStatus(for: .contacts))
  }

  func requestPermission() throws -> Promise<ContactsPermissionStatus> {
    let promise = Promise<ContactsPermissionStatus>()
    DispatchQueue.main.async {
      guard Self.hasUsageDescription else {
        promise.reject(withError: Self.error(
          "E_CONTACTS_MANIFEST", "Contacts.requestPermission: set native.app.contacts.usage"))
        return
      }
      CNContactStore().requestAccess(for: .contacts) { _, error in
        let status = Self.status(CNContactStore.authorizationStatus(for: .contacts))
        if status != .notdetermined {
          promise.resolve(withResult: status)
        } else if let error {
          promise.reject(withError: Self.error(
            "E_CONTACTS_PERMISSION", "Contacts.requestPermission: \(error.localizedDescription)"))
        } else {
          promise.resolve(withResult: status)
        }
      }
    }
    return promise
  }

  func search(name: String, limit: Double) throws -> Promise<[ContactInfo]> {
    let promise = Promise<[ContactInfo]>()
    DispatchQueue.global(qos: .userInitiated).async {
      guard Self.hasUsageDescription else {
        promise.reject(withError: Self.error(
          "E_CONTACTS_MANIFEST", "Contacts.search: set native.app.contacts.usage"))
        return
      }
      guard Self.canAccess else {
        promise.reject(withError: Self.error(
          "E_CONTACTS_PERMISSION", "Contacts.search: Contacts permission is required"))
        return
      }
      let text = name.trimmingCharacters(in: .whitespacesAndNewlines)
      guard !text.isEmpty, limit.isFinite, limit >= 1, limit <= 100, limit.rounded() == limit else {
        promise.reject(withError: Self.error(
          "E_CONTACTS_INPUT", "Contacts.search: provide a name and an integer limit from 1 to 100"))
        return
      }
      let request = CNContactFetchRequest(keysToFetch: Self.keys)
      request.predicate = CNContact.predicateForContacts(matchingName: text)
      request.sortOrder = .userDefault
      var contacts: [ContactInfo] = []
      do {
        try CNContactStore().enumerateContacts(with: request) { contact, stop in
          contacts.append(ContactInfo(
            identifier: contact.identifier,
            givenName: contact.givenName,
            familyName: contact.familyName,
            phoneNumbers: contact.phoneNumbers.map { $0.value.stringValue },
            emailAddresses: contact.emailAddresses.map { String($0.value) }
          ))
          if contacts.count >= Int(limit) { stop.pointee = true }
        }
        promise.resolve(withResult: contacts)
      } catch {
        promise.reject(withError: Self.error(
          "E_CONTACTS_FETCH", "Contacts.search: \(error.localizedDescription)"))
      }
    }
    return promise
  }

  func create(input: ContactInput) throws -> Promise<String> {
    let promise = Promise<String>()
    DispatchQueue.global(qos: .userInitiated).async {
      guard Self.hasUsageDescription else {
        promise.reject(withError: Self.error(
          "E_CONTACTS_MANIFEST", "Contacts.create: set native.app.contacts.usage"))
        return
      }
      guard Self.canAccess else {
        promise.reject(withError: Self.error(
          "E_CONTACTS_PERMISSION", "Contacts.create: Contacts permission is required"))
        return
      }
      let given = input.givenName.trimmingCharacters(in: .whitespacesAndNewlines)
      let family = input.familyName.trimmingCharacters(in: .whitespacesAndNewlines)
      guard !given.isEmpty || !family.isEmpty else {
        promise.reject(withError: Self.error(
          "E_CONTACTS_INPUT", "Contacts.create: provide a given or family name"))
        return
      }
      let contact = CNMutableContact()
      contact.givenName = given
      contact.familyName = family
      contact.phoneNumbers = input.phoneNumbers.map {
        CNLabeledValue(label: CNLabelPhoneNumberMain, value: CNPhoneNumber(stringValue: $0))
      }
      contact.emailAddresses = input.emailAddresses.map {
        CNLabeledValue(label: CNLabelHome, value: $0 as NSString)
      }
      let request = CNSaveRequest()
      request.add(contact, toContainerWithIdentifier: nil)
      do {
        try CNContactStore().execute(request)
        promise.resolve(withResult: contact.identifier)
      } catch {
        promise.reject(withError: Self.error(
          "E_CONTACTS_SAVE", "Contacts.create: \(error.localizedDescription)"))
      }
    }
    return promise
  }

  func remove(identifier: String) throws -> Promise<Void> {
    let promise = Promise<Void>()
    DispatchQueue.global(qos: .userInitiated).async {
      guard Self.hasUsageDescription else {
        promise.reject(withError: Self.error(
          "E_CONTACTS_MANIFEST", "Contacts.delete: set native.app.contacts.usage"))
        return
      }
      guard Self.canAccess else {
        promise.reject(withError: Self.error(
          "E_CONTACTS_PERMISSION", "Contacts.delete: Contacts permission is required"))
        return
      }
      guard !identifier.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
        promise.reject(withError: Self.error(
          "E_CONTACTS_INPUT", "Contacts.delete: identifier is required"))
        return
      }
      do {
        let store = CNContactStore()
        let contact = try store.unifiedContact(
          withIdentifier: identifier, keysToFetch: Self.keys).mutableCopy() as! CNMutableContact
        let request = CNSaveRequest()
        request.delete(contact)
        try store.execute(request)
        promise.resolve()
      } catch {
        promise.reject(withError: Self.error(
          "E_CONTACTS_DELETE", "Contacts.delete: \(error.localizedDescription)"))
      }
    }
    return promise
  }

  private static let keys: [CNKeyDescriptor] = [
    CNContactIdentifierKey as CNKeyDescriptor,
    CNContactGivenNameKey as CNKeyDescriptor,
    CNContactFamilyNameKey as CNKeyDescriptor,
    CNContactPhoneNumbersKey as CNKeyDescriptor,
    CNContactEmailAddressesKey as CNKeyDescriptor,
  ]

  private static var canAccess: Bool {
    let status = CNContactStore.authorizationStatus(for: .contacts)
    if #available(iOS 18.0, *), status == .limited { return true }
    return status == .authorized
  }

  private static var hasUsageDescription: Bool {
    guard let usage = Bundle.main.object(forInfoDictionaryKey: "NSContactsUsageDescription")
      as? String else { return false }
    return !usage.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
  }

  private static func status(_ value: CNAuthorizationStatus) -> ContactsPermissionStatus {
    if #available(iOS 18.0, *), value == .limited { return .limited }
    switch value {
    case .notDetermined: return .notdetermined
    case .restricted: return .restricted
    case .denied: return .denied
    case .authorized: return .authorized
    default: return .restricted
    }
  }

  private static func error(_ code: String, _ message: String) -> RuntimeError {
    oneNativeError(code, message)
  }
}
