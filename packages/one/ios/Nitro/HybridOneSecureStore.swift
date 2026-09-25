import Foundation
import NitroModules
import Security

// string key-value storage matching expo-secure-store's item api, backed by
// the keychain: generic-password items keyed by account under one service,
// readable while the device is unlocked. a missing key reads nil; deleting
// one resolves all the same.
final class HybridOneSecureStore: HybridOneSecureStoreSpec {
  private static let service = "One.SecureStore"

  private static func query(key: String) -> [String: Any] {
    return [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: service,
      kSecAttrAccount as String: key,
    ]
  }

  private static func read(key: String) throws -> String? {
    var lookup = query(key: key)
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

  private static func write(key: String, value: String) throws {
    guard let data = value.data(using: .utf8) else {
      throw oneNativeError(
        "E_SECURE_STORE_SET", "SecureStore.setItem: the value is not utf-8 text")
    }
    let status = SecItemUpdate(query(key: key) as CFDictionary, [kSecValueData as String: data] as CFDictionary)
    if status == errSecSuccess {
      return
    }
    if status != errSecItemNotFound {
      throw oneNativeError(
        "E_SECURE_STORE_SET", "SecureStore.setItem: the keychain write failed (status \(status))")
    }
    var addition = query(key: key)
    addition[kSecValueData as String] = data
    addition[kSecAttrAccessible as String] = kSecAttrAccessibleWhenUnlocked
    let added = SecItemAdd(addition as CFDictionary, nil)
    if added != errSecSuccess {
      throw oneNativeError(
        "E_SECURE_STORE_SET", "SecureStore.setItem: the keychain write failed (status \(added))")
    }
  }

  private static func remove(key: String) throws {
    let status = SecItemDelete(query(key: key) as CFDictionary)
    if status != errSecSuccess && status != errSecItemNotFound {
      throw oneNativeError(
        "E_SECURE_STORE_DELETE",
        "SecureStore.deleteItem: the keychain delete failed (status \(status))")
    }
  }

  func getItem(key: String) throws -> Promise<String?> {
    do {
      return Promise.resolved(withResult: try Self.read(key: key))
    } catch {
      return Promise.rejected(withError: error)
    }
  }

  func setItem(key: String, value: String) throws -> Promise<Void> {
    do {
      try Self.write(key: key, value: value)
      return Promise.resolved()
    } catch {
      return Promise.rejected(withError: error)
    }
  }

  func deleteItem(key: String) throws -> Promise<Void> {
    do {
      try Self.remove(key: key)
      return Promise.resolved()
    } catch {
      return Promise.rejected(withError: error)
    }
  }
}
