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
          contacts.append(Self.info(contact))
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
      guard !Self.hasBlank(input.phoneNumbers), !Self.hasBlank(input.emailAddresses) else {
        promise.reject(withError: Self.error(
          "E_CONTACTS_INPUT", "Contacts.create: phone numbers and email addresses cannot be blank"))
        return
      }
      let contact = CNMutableContact()
      contact.givenName = given
      contact.familyName = family
      contact.phoneNumbers = Self.phones(input.phoneNumbers)
      contact.emailAddresses = Self.emails(input.emailAddresses)
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

  func update(identifier: String, changes: ContactChanges) throws -> Promise<ContactInfo> {
    let promise = Promise<ContactInfo>()
    DispatchQueue.global(qos: .userInitiated).async {
      guard Self.hasUsageDescription else {
        promise.reject(withError: Self.error(
          "E_CONTACTS_MANIFEST", "Contacts.update: set native.app.contacts.usage"))
        return
      }
      guard Self.canAccess else {
        promise.reject(withError: Self.error(
          "E_CONTACTS_PERMISSION", "Contacts.update: Contacts permission is required"))
        return
      }
      guard !identifier.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
        changes.givenName != nil || changes.familyName != nil ||
          changes.phoneNumbers != nil || changes.emailAddresses != nil else {
        promise.reject(withError: Self.error(
          "E_CONTACTS_INPUT", "Contacts.update: an identifier and at least one change are required"))
        return
      }
      if let values = changes.phoneNumbers, Self.hasBlank(values) {
        promise.reject(withError: Self.error(
          "E_CONTACTS_INPUT", "Contacts.update: phone numbers cannot be blank"))
        return
      }
      if let values = changes.emailAddresses, Self.hasBlank(values) {
        promise.reject(withError: Self.error(
          "E_CONTACTS_INPUT", "Contacts.update: email addresses cannot be blank"))
        return
      }
      do {
        let store = CNContactStore()
        let stored = try store.unifiedContact(withIdentifier: identifier, keysToFetch: Self.keys)
        guard let contact = stored.mutableCopy() as? CNMutableContact else {
          promise.reject(withError: Self.error(
            "E_CONTACTS_SAVE", "Contacts.update: could not edit the contact"))
          return
        }
        if changes.givenName != nil || changes.familyName != nil {
          let given = (changes.givenName ?? contact.givenName)
            .trimmingCharacters(in: .whitespacesAndNewlines)
          let family = (changes.familyName ?? contact.familyName)
            .trimmingCharacters(in: .whitespacesAndNewlines)
          guard !given.isEmpty || !family.isEmpty else {
            promise.reject(withError: Self.error(
              "E_CONTACTS_INPUT", "Contacts.update: provide a given or family name"))
            return
          }
        }
        if let given = changes.givenName {
          contact.givenName = given.trimmingCharacters(in: .whitespacesAndNewlines)
        }
        if let family = changes.familyName {
          contact.familyName = family.trimmingCharacters(in: .whitespacesAndNewlines)
        }
        if let phones = changes.phoneNumbers {
          contact.phoneNumbers = Self.phones(phones, preserving: contact.phoneNumbers)
        }
        if let emails = changes.emailAddresses {
          contact.emailAddresses = Self.emails(emails, preserving: contact.emailAddresses)
        }
        let request = CNSaveRequest()
        request.update(contact)
        try store.execute(request)
        promise.resolve(withResult: Self.info(contact))
      } catch {
        let native = error as NSError
        let code = native.domain == CNErrorDomain &&
          native.code == CNError.Code.recordDoesNotExist.rawValue
          ? "E_CONTACTS_NOT_FOUND" : "E_CONTACTS_SAVE"
        promise.reject(withError: Self.error(code, "Contacts.update: \(error.localizedDescription)"))
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
        let native = error as NSError
        let code = native.domain == CNErrorDomain &&
          native.code == CNError.Code.recordDoesNotExist.rawValue
          ? "E_CONTACTS_NOT_FOUND" : "E_CONTACTS_DELETE"
        promise.reject(withError: Self.error(
          code, "Contacts.delete: \(error.localizedDescription)"))
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

  private static func info(_ contact: CNContact) -> ContactInfo {
    ContactInfo(
      identifier: contact.identifier,
      givenName: contact.givenName,
      familyName: contact.familyName,
      phoneNumbers: contact.phoneNumbers.map { $0.value.stringValue },
      emailAddresses: contact.emailAddresses.map { String($0.value) }
    )
  }

  private static func hasBlank(_ values: [String]) -> Bool {
    values.contains { $0.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
  }

  private static func phones(
    _ values: [String], preserving existing: [CNLabeledValue<CNPhoneNumber>] = []
  ) -> [CNLabeledValue<CNPhoneNumber>] {
    var remaining = existing
    return values.map { value in
      if let index = remaining.firstIndex(where: { $0.value.stringValue == value }) {
        return remaining.remove(at: index)
      }
      return CNLabeledValue(label: CNLabelPhoneNumberMain, value: CNPhoneNumber(stringValue: value))
    }
  }

  private static func emails(
    _ values: [String], preserving existing: [CNLabeledValue<NSString>] = []
  ) -> [CNLabeledValue<NSString>] {
    var remaining = existing
    return values.map { value in
      if let index = remaining.firstIndex(where: { String($0.value) == value }) {
        return remaining.remove(at: index)
      }
      return CNLabeledValue(label: CNLabelHome, value: value as NSString)
    }
  }

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
