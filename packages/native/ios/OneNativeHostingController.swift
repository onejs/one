import SwiftUI
import UIKit

final class OneNativeHostingController<Content: View>: UIHostingController<Content> {
  func attach(to host: UIView) {
    guard host.window != nil else { detach(); return }
    var responder: UIResponder? = host.next
    while responder != nil && !(responder is UIViewController) { responder = responder?.next }
    var parent = responder as? UIViewController
    if let tabController = parent as? UITabBarController {
      parent = tabController.selectedViewController
    }
    guard let parent else { return }
    if self.parent !== parent {
      detach()
      parent.addChild(self)
      view.backgroundColor = .clear
      view.frame = host.bounds
      view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
      host.addSubview(view)
      didMove(toParent: parent)
    }
    view.frame = host.bounds
  }

  func detach() {
    guard parent != nil else { return }
    willMove(toParent: nil)
    view.removeFromSuperview()
    removeFromParent()
  }
}
