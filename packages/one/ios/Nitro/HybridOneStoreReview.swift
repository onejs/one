import NitroModules
import StoreKit
import UIKit

final class HybridOneStoreReview: HybridOneStoreReviewSpec {
  func requestReview() throws -> Promise<Void> {
    let promise = Promise<Void>()
    DispatchQueue.main.async {
      guard let scene = oneNativePresentingViewController()?.view.window?.windowScene else {
        promise.reject(withError: oneNativeError("E_STORE_REVIEW_SCENE", "StoreReview.requestReview: no active window scene"))
        return
      }
      AppStore.requestReview(in: scene)
      promise.resolve(withResult: ())
    }
    return promise
  }
}
