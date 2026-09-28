import React
import UIKit

func oneNativePresentingViewController() -> UIViewController? {
  var presenter = RCTKeyWindow()?.rootViewController
  while let presented = presenter?.presentedViewController { presenter = presented }
  guard UIApplication.shared.applicationState == .active,
    let presenter, presenter.view.window != nil,
    !presenter.isBeingDismissed, !presenter.isBeingPresented,
    presenter.transitionCoordinator == nil
  else { return nil }
  return presenter
}
