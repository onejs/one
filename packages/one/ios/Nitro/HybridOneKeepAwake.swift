import NitroModules
import UIKit

final class HybridOneKeepAwake: HybridOneKeepAwakeSpec {
  func isEnabled() throws -> Promise<Bool> {
    let promise = Promise<Bool>()
    DispatchQueue.main.async {
      promise.resolve(withResult: UIApplication.shared.isIdleTimerDisabled)
    }
    return promise
  }

  func setEnabled(enabled: Bool) throws -> Promise<Void> {
    let promise = Promise<Void>()
    DispatchQueue.main.async {
      UIApplication.shared.isIdleTimerDisabled = enabled
      promise.resolve(withResult: ())
    }
    return promise
  }
}
