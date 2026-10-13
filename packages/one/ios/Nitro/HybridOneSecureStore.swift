import Foundation
import LocalAuthentication
import NitroModules
import Security

// string key-value storage matching expo-secure-store's item api and its
// options, backed by the keychain: generic-password items keyed by account
// under the option's service (default One.SecureStore, so items written
// before options existed read back unchanged). an authenticated item lives
// under "<service>:auth" with a biometryCurrentSet access control, like
// expo's split; a read checks the plain service first, then the auth
// service, and a write removes the other mode's item. a missing key reads
// nil; deleting one resolves all the same and never prompts.
final class HybridOneSecureStore: HybridOneSecureStoreSpec {
  private static let defaultService = "One.SecureStore"

  private static func service(options: SecureStoreOptions, authenticated: Bool) -> String {
    let base = options.keychainService ?? defaultService
    return authenticated ? base + ":auth" : base
  }

  private static func query(key: String, options: SecureStoreOptions, authenticated: Bool)
    -> [String: Any]
  {
    var query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: service(options: options, authenticated: authenticated),
      kSecAttrAccount as String: key,
    ]
    if let accessGroup = options.accessGroup {
      query[kSecAttrAccessGroup as String] = accessGroup
    }
    return query
  }

  private static func accessible(options: SecureStoreOptions) -> CFString {
    switch options.keychainAccessible {
    case .afterfirstunlock: return kSecAttrAccessibleAfterFirstUnlock
    case .afterfirstunlockthisdeviceonly: return kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
    case .always: return kSecAttrAccessibleAlways
    case .alwaysthisdeviceonly: return kSecAttrAccessibleAlwaysThisDeviceOnly
    case .whenpasscodesetthisdeviceonly: return kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly
    case .whenunlockedthisdeviceonly: return kSecAttrAccessibleWhenUnlockedThisDeviceOnly
    case .whenunlocked, nil: return kSecAttrAccessibleWhenUnlocked
    }
  }

  // the authentication context carries the prompt; without a custom prompt
  // no context is attached and the system wording stands.
  private static func withPrompt(_ query: [String: Any], options: SecureStoreOptions)
    -> [String: Any]
  {
    guard let prompt = options.authenticationPrompt else { return query }
    var next = query
    let context = LAContext()
    context.localizedReason = prompt
    next[kSecUseAuthenticationContext as String] = context
    return next
  }

  private static func fetch(key: String, options: SecureStoreOptions, authenticated: Bool) throws
    -> String?
  {
    var lookup = withPrompt(query(key: key, options: options, authenticated: authenticated), options: options)
    lookup[kSecReturnData as String] = true
    lookup[kSecMatchLimit as String] = kSecMatchLimitOne
    var item: CFTypeRef?
    let status = SecItemCopyMatching(lookup as CFDictionary, &item)
    if status == errSecItemNotFound {
      return nil
    }
    if status != errSecSuccess {
      throw oneNativeError(
        "E_SECURE_STORE_GET", "SecureStore.getItem: the keychain read failed (status \(status))")
    }
    guard let data = item as? Data, let value = String(data: data, encoding: .utf8) else {
      throw oneNativeError(
        "E_SECURE_STORE_GET", "SecureStore.getItem: the stored value is not utf-8 text")
    }
    return value
  }

  private static func read(key: String, options: SecureStoreOptions) throws -> String? {
    if let value = try fetch(key: key, options: options, authenticated: false) {
      return value
    }
    return try fetch(key: key, options: options, authenticated: true)
  }

  private static func write(key: String, value: String, options: SecureStoreOptions) throws {
    guard let data = value.data(using: .utf8) else {
      throw oneNativeError(
        "E_SECURE_STORE_SET", "SecureStore.setItem: the value is not utf-8 text")
    }
    let authenticated = options.requireAuthentication ?? false
    let target = query(key: key, options: options, authenticated: authenticated)
    let status = SecItemUpdate(
      withPrompt(target, options: options) as CFDictionary,
      [kSecValueData as String: data] as CFDictionary)
    if status == errSecSuccess {
      removeOther(key: key, options: options, authenticated: authenticated)
      return
    }
    if status != errSecItemNotFound {
      throw oneNativeError(
        "E_SECURE_STORE_SET", "SecureStore.setItem: the keychain write failed (status \(status))")
    }
    var addition = target
    addition[kSecValueData as String] = data
    if authenticated {
      var error: Unmanaged<CFError>?
      guard
        let control = SecAccessControlCreateWithFlags(
          kCFAllocatorDefault, accessible(options: options), .biometryCurrentSet, &error)
      else {
        throw oneNativeError(
          "E_SECURE_STORE_SET",
          "SecureStore.setItem: the authentication access control could not be created")
      }
      addition[kSecAttrAccessControl as String] = control
    } else {
      addition[kSecAttrAccessible as String] = accessible(options: options)
    }
    let added = SecItemAdd(addition as CFDictionary, nil)
    if added != errSecSuccess {
      throw oneNativeError(
        "E_SECURE_STORE_SET", "SecureStore.setItem: the keychain write failed (status \(added))")
    }
    removeOther(key: key, options: options, authenticated: authenticated)
  }

  // one value per key across the two modes: writing one mode clears the
  // other, so a later read can never return a stale mode's value.
  private static func removeOther(key: String, options: SecureStoreOptions, authenticated: Bool) {
    SecItemDelete(query(key: key, options: options, authenticated: !authenticated) as CFDictionary)
  }

  private static func remove(key: String, options: SecureStoreOptions) throws {
    for authenticated in [false, true] {
      let status = SecItemDelete(
        query(key: key, options: options, authenticated: authenticated) as CFDictionary)
      if status != errSecSuccess && status != errSecItemNotFound {
        throw oneNativeError(
          "E_SECURE_STORE_DELETE",
          "SecureStore.deleteItem: the keychain delete failed (status \(status))")
      }
    }
  }

  func getItem(key: String, options: SecureStoreOptions) throws -> Promise<String?> {
    do {
      return Promise.resolved(withResult: try Self.read(key: key, options: options))
    } catch {
      return Promise.rejected(withError: error)
    }
  }

  func setItem(key: String, value: String, options: SecureStoreOptions) throws -> Promise<Void> {
    do {
      try Self.write(key: key, value: value, options: options)
      return Promise.resolved()
    } catch {
      return Promise.rejected(withError: error)
    }
  }

  func deleteItem(key: String, options: SecureStoreOptions) throws -> Promise<Void> {
    do {
      try Self.remove(key: key, options: options)
      return Promise.resolved()
    } catch {
      return Promise.rejected(withError: error)
    }
  }

  func getItemSync(key: String, options: SecureStoreOptions) throws -> String? {
    return try Self.read(key: key, options: options)
  }

  func setItemSync(key: String, value: String, options: SecureStoreOptions) throws {
    try Self.write(key: key, value: value, options: options)
  }

  func deleteItemSync(key: String, options: SecureStoreOptions) throws {
    try Self.remove(key: key, options: options)
  }
}
