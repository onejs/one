import NitroModules
import UIKit

final class HybridOneKeepAwake: HybridOneKeepAwakeSpec {
  private static let defaultTag = "ExpoKeepAwakeDefaultTag"
  private var tags = Set<String>()

  private func apply() {
    UIApplication.shared.isIdleTimerDisabled = !tags.isEmpty
  }

  func isEnabled() throws -> Promise<Bool> {
    let promise = Promise<Bool>()
    DispatchQueue.main.async {
      promise.resolve(withResult: !self.tags.isEmpty)
    }
    return promise
  }

  func setEnabled(enabled: Bool) throws -> Promise<Void> {
    let promise = Promise<Void>()
    DispatchQueue.main.async {
      if enabled {
        self.tags.insert(Self.defaultTag)
      } else {
        self.tags.remove(Self.defaultTag)
      }
      self.apply()
      promise.resolve(withResult: ())
    }
    return promise
  }

  func activate(tag: String) throws -> Promise<Void> {
    let promise = Promise<Void>()
    DispatchQueue.main.async {
      self.tags.insert(tag)
      self.apply()
      promise.resolve(withResult: ())
    }
    return promise
  }

  func deactivate(tag: String) throws -> Promise<Void> {
    let promise = Promise<Void>()
    DispatchQueue.main.async {
      self.tags.remove(tag)
      self.apply()
      promise.resolve(withResult: ())
    }
    return promise
  }
}
