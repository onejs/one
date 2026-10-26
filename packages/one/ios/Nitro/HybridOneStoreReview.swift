#if ONE_GROUP_STORE
import NitroModules
import StoreKit
import UIKit

// the app store review prompt behind One.StoreReview. it asks only while a
// window scene is in the foreground with nothing presenting or being presented.
final class HybridOneStoreReview: HybridOneStoreReviewSpec {
  func requestReview() throws -> Promise<Void> {
    let promise = Promise<Void>()
    DispatchQueue.main.async {
      let application = UIApplication.shared
      var presenter = application.connectedScenes
        .compactMap { ($0 as? UIWindowScene)?.keyWindow }
        .first?.rootViewController
      while let presented = presenter?.presentedViewController, !presented.isBeingDismissed {
        presenter = presented
      }
      guard
        let presenter,
        let scene = presenter.view.window?.windowScene,
        application.applicationState == .active,
        !presenter.isBeingDismissed,
        !presenter.isBeingPresented,
        presenter.transitionCoordinator == nil
      else {
        promise.reject(withError: oneNativeError(
          "E_STORE_REVIEW_SCENE", "StoreReview.requestReview: no active window scene"))
        return
      }
      AppStore.requestReview(in: scene)
      promise.resolve(withResult: ())
    }
    return promise
  }
}
#endif
