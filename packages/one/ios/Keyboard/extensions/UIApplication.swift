import Foundation
import UIKit

extension UIApplication {
  var activeWindow: UIWindow? {
    if #available(iOS 13.0, *) {
      for scene in connectedScenes {
        if scene.activationState == .foregroundActive,
           let windowScene = scene as? UIWindowScene,
           let keyWindow = windowScene.windows.first(where: { $0.isKeyWindow })
        {
          return keyWindow
        }
      }
      return nil
    } else {
      return windows.last { $0.isKeyWindow }
    }
  }

  static func topViewController(
    base: UIViewController? = UIApplication.shared.activeWindow?.rootViewController
  ) -> UIViewController? {
    if let nav = base as? UINavigationController {
      return topViewController(base: nav.visibleViewController)
    }

    if let tab = base as? UITabBarController, let selected = tab.selectedViewController {
      return topViewController(base: selected)
    }

    if let presented = base?.presentedViewController, !presented.isBeingDismissed {
      return topViewController(base: presented)
    }

    return base
  }
}
