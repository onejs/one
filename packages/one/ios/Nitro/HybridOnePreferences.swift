import Foundation
import NitroModules

// keep small, non-secret string settings apart from app-owned defaults.
final class HybridOnePreferences: HybridOnePreferencesSpec {
  private static let prefix = "One.Preferences."

  private static func storedKey(_ key: String) throws -> String {
    guard !key.isEmpty else {
      throw oneNativeError("E_PREFERENCES_INPUT", "Preferences: key must be a non-empty string")
    }
    return prefix + key
  }

  private static func read(_ key: String) throws -> String? {
    return UserDefaults.standard.string(forKey: try storedKey(key))
  }

  private static func write(_ key: String, value: String) throws {
    UserDefaults.standard.set(value, forKey: try storedKey(key))
  }

  private static func remove(_ key: String) throws {
    UserDefaults.standard.removeObject(forKey: try storedKey(key))
  }

  func getItem(key: String) throws -> Promise<String?> {
    do {
      return Promise.resolved(withResult: try Self.read(key))
    } catch {
      return Promise.rejected(withError: error)
    }
  }

  func setItem(key: String, value: String) throws -> Promise<Void> {
    do {
      try Self.write(key, value: value)
      return Promise.resolved()
    } catch {
      return Promise.rejected(withError: error)
    }
  }

  func deleteItem(key: String) throws -> Promise<Void> {
    do {
      try Self.remove(key)
      return Promise.resolved()
    } catch {
      return Promise.rejected(withError: error)
    }
  }

  func getItemSync(key: String) throws -> String? {
    return try Self.read(key)
  }

  func setItemSync(key: String, value: String) throws {
    try Self.write(key, value: value)
  }

  func deleteItemSync(key: String) throws {
    try Self.remove(key)
  }
}
