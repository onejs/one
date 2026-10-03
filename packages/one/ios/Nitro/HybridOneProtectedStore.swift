import Foundation
import LocalAuthentication
import NitroModules
import Security

final class HybridOneProtectedStore: HybridOneProtectedStoreSpec {
  private static let service = "One.ProtectedStore"

  func createItem(key: String, value: String, policy: ProtectedStorePolicy) throws -> Promise<Void> {
    let promise = Promise<Void>()
    DispatchQueue.global(qos: .userInitiated).async {
      do {
        try Self.validate(key: key, operation: "createItem")
        let flags: SecAccessControlCreateFlags = policy == .userpresence
          ? .userPresence : .biometryCurrentSet
        var accessError: Unmanaged<CFError>?
        guard let access = SecAccessControlCreateWithFlags(
          nil, kSecAttrAccessibleWhenUnlockedThisDeviceOnly, flags, &accessError
        ) else {
          let detail = accessError?.takeRetainedValue().localizedDescription ?? "access control is unavailable"
          throw oneNativeError("E_PROTECTED_STORE_AUTH", "ProtectedStore.createItem: \(detail)")
        }
        var attributes = Self.query(key: key)
        attributes[kSecValueData as String] = Data(value.utf8)
        attributes[kSecAttrAccessControl as String] = access
        attributes[kSecAttrLabel as String] = policy.stringValue
        let status = SecItemAdd(attributes as CFDictionary, nil)
        if status == errSecDuplicateItem {
          throw oneNativeError("E_PROTECTED_STORE_EXISTS", "ProtectedStore.createItem: key already exists")
        }
        guard status == errSecSuccess else {
          throw Self.failure("createItem", status)
        }
        promise.resolve()
      } catch {
        promise.reject(withError: error)
      }
    }
    return promise
  }

  func getItem(key: String, reason: String, policy: ProtectedStorePolicy) throws -> Promise<String?> {
    let promise = Promise<String?>()
    DispatchQueue.global(qos: .userInitiated).async {
      do {
        try Self.validate(key: key, reason: reason, operation: "getItem")
        guard try Self.exists(key: key, operation: "getItem") else {
          promise.resolve(withResult: nil)
          return
        }
        let context = Self.context(reason: reason)
        Self.verify(context: context, policy: policy, reason: reason, operation: "getItem") {
          error in
          if let error { promise.reject(withError: error); return }
          do {
            guard let item = try Self.read(key: key, context: context, operation: "getItem") else {
              promise.resolve(withResult: nil)
              return
            }
            try Self.requirePolicy(item.policy, policy, operation: "getItem")
            promise.resolve(withResult: item.value)
          } catch {
            promise.reject(withError: error)
          }
        }
      } catch {
        promise.reject(withError: error)
      }
    }
    return promise
  }

  func updateItem(key: String, value: String, reason: String, policy: ProtectedStorePolicy) throws -> Promise<Void> {
    let promise = Promise<Void>()
    DispatchQueue.global(qos: .userInitiated).async {
      do {
        try Self.validate(key: key, reason: reason, operation: "updateItem")
        guard try Self.exists(key: key, operation: "updateItem") else {
          throw oneNativeError("E_PROTECTED_STORE_NOT_FOUND", "ProtectedStore.updateItem: key is missing")
        }
        let context = Self.context(reason: reason)
        Self.verify(context: context, policy: policy, reason: reason, operation: "updateItem") {
          error in
          if let error { promise.reject(withError: error); return }
          do {
            guard let item = try Self.read(key: key, context: context, operation: "updateItem") else {
              throw oneNativeError("E_PROTECTED_STORE_NOT_FOUND", "ProtectedStore.updateItem: key is missing")
            }
            try Self.requirePolicy(item.policy, policy, operation: "updateItem")
            var lookup = Self.query(key: key)
            lookup[kSecUseAuthenticationContext as String] = context
            let status = SecItemUpdate(
              lookup as CFDictionary, [kSecValueData as String: Data(value.utf8)] as CFDictionary)
            if status == errSecItemNotFound {
              throw oneNativeError("E_PROTECTED_STORE_NOT_FOUND", "ProtectedStore.updateItem: key is missing")
            }
            guard status == errSecSuccess else { throw Self.failure("updateItem", status) }
            promise.resolve()
          } catch {
            promise.reject(withError: error)
          }
        }
      } catch {
        promise.reject(withError: error)
      }
    }
    return promise
  }

  func deleteItem(key: String, reason: String, policy: ProtectedStorePolicy) throws -> Promise<Void> {
    let promise = Promise<Void>()
    DispatchQueue.global(qos: .userInitiated).async {
      do {
        try Self.validate(key: key, reason: reason, operation: "deleteItem")
        guard try Self.exists(key: key, operation: "deleteItem") else {
          let status = SecItemDelete(Self.query(key: key) as CFDictionary)
          if status == errSecSuccess || status == errSecItemNotFound { promise.resolve() }
          else { promise.reject(withError: Self.failure("deleteItem", status)) }
          return
        }
        let context = Self.context(reason: reason)
        Self.verify(context: context, policy: policy, reason: reason, operation: "deleteItem") {
          error in
          if let error { promise.reject(withError: error); return }
          var lookup = Self.query(key: key)
          lookup[kSecUseAuthenticationContext as String] = context
          let status = SecItemDelete(lookup as CFDictionary)
          if status != errSecSuccess && status != errSecItemNotFound {
            promise.reject(withError: Self.failure("deleteItem", status))
          } else { promise.resolve() }
        }
      } catch {
        promise.reject(withError: error)
      }
    }
    return promise
  }

  private static func query(key: String) -> [String: Any] {
    [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: service,
      kSecAttrAccount as String: key,
    ]
  }

  private static func context(reason: String) -> LAContext {
    let context = LAContext()
    context.localizedReason = reason
    return context
  }

  private static func exists(key: String, operation: String) throws -> Bool {
    let context = LAContext()
    context.interactionNotAllowed = true
    var lookup = query(key: key)
    lookup[kSecReturnAttributes as String] = true
    lookup[kSecMatchLimit as String] = kSecMatchLimitOne
    lookup[kSecUseAuthenticationContext as String] = context
    var item: CFTypeRef?
    let status = SecItemCopyMatching(lookup as CFDictionary, &item)
    if status == errSecItemNotFound { return false }
    if status == errSecSuccess || status == errSecInteractionNotAllowed || status == errSecAuthFailed {
      return true
    }
    throw failure(operation, status)
  }

  private static func read(
    key: String, context: LAContext, operation: String
  ) throws -> (value: String, policy: ProtectedStorePolicy)? {
    var lookup = query(key: key)
    lookup[kSecReturnData as String] = true
    lookup[kSecReturnAttributes as String] = true
    lookup[kSecMatchLimit as String] = kSecMatchLimitOne
    lookup[kSecUseAuthenticationContext as String] = context
    var item: CFTypeRef?
    let status = SecItemCopyMatching(lookup as CFDictionary, &item)
    if status == errSecItemNotFound { return nil }
    guard status == errSecSuccess else { throw failure(operation, status, read: true) }
    guard let attributes = item as? [String: Any],
      let data = attributes[kSecValueData as String] as? Data,
      let value = String(data: data, encoding: .utf8),
      let label = attributes[kSecAttrLabel as String] as? String,
      let storedPolicy = ProtectedStorePolicy(fromString: label) else {
      throw oneNativeError("E_PROTECTED_STORE_GET", "ProtectedStore.\(operation): invalid item")
    }
    return (value, storedPolicy)
  }

  private static func requirePolicy(
    _ stored: ProtectedStorePolicy, _ requested: ProtectedStorePolicy, operation: String
  ) throws {
    guard stored == requested else {
      throw oneNativeError("E_PROTECTED_STORE_POLICY", "ProtectedStore.\(operation): policy does not match the item")
    }
  }

  private static func verify(
    context: LAContext, policy: ProtectedStorePolicy, reason: String, operation: String,
    completion: @escaping (Error?) -> Void
  ) {
    let laPolicy: LAPolicy = policy == .userpresence
      ? .deviceOwnerAuthentication : .deviceOwnerAuthenticationWithBiometrics
    if policy == .biometrycurrentset { context.localizedFallbackTitle = "" }
    context.evaluatePolicy(laPolicy, localizedReason: reason) { success, error in
      if success {
        context.interactionNotAllowed = true
        completion(nil)
        return
      }
      let code: String
      switch (error as? LAError)?.code {
      case .userCancel, .appCancel, .systemCancel, .userFallback:
        code = "E_PROTECTED_STORE_CANCELLED"
      default:
        code = "E_PROTECTED_STORE_AUTH"
      }
      completion(oneNativeError(code, "ProtectedStore.\(operation): \(error?.localizedDescription ?? "authentication failed")"))
    }
  }

  private static func validate(key: String, reason: String? = nil, operation: String) throws {
    guard let usage = Bundle.main.object(forInfoDictionaryKey: "NSFaceIDUsageDescription") as? String,
      !usage.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
      throw oneNativeError(
        "E_PROTECTED_STORE_MANIFEST", "ProtectedStore.\(operation): set native.app.ios.faceIdUsageDescription")
    }
    guard !key.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
      throw oneNativeError("E_PROTECTED_STORE_INPUT", "ProtectedStore.\(operation): key is required")
    }
    if let reason, reason.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
      throw oneNativeError("E_PROTECTED_STORE_INPUT", "ProtectedStore.\(operation): reason is required")
    }
  }

  private static func failure(_ operation: String, _ status: OSStatus, read: Bool = false) -> RuntimeError {
    let code: String
    switch status {
    case errSecUserCanceled: code = "E_PROTECTED_STORE_CANCELLED"
    case errSecAuthFailed, errSecInteractionNotAllowed: code = "E_PROTECTED_STORE_AUTH"
    default: code = "E_PROTECTED_STORE_\(read || operation == "getItem" ? "GET" : "WRITE")"
    }
    return oneNativeError(code, "ProtectedStore.\(operation): keychain status \(status)")
  }
}
