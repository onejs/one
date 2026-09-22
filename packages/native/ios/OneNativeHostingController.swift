import SwiftUI
import UIKit

final class OneNativeHostingController<Content: View>: UIHostingController<Content> {
  var isAttached: Bool { view.superview != nil }

  // the parent is the view controller whose view is the nearest ancestor of the host,
  // the first view controller on the responder chain: uikit resolves that same
  // controller when the hosted view is added and raises
  // UIViewControllerHierarchyInconsistency for any other parent, so the parent is
  // never redirected. one controller cannot take the child at all: a UITabBarController's
  // children are its tabs, and react-native-screens casts every one of them to a tab
  // screen, so a host inside the tab bar's own view (a bottom accessory) is hosted
  // without containment, as a plain subview.
  func attach(to host: UIView) {
    guard host.window != nil else { detach(); return }
    var responder: UIResponder? = host.next
    while responder != nil && !(responder is UIViewController) { responder = responder?.next }
    guard let nearest = responder as? UIViewController else { return }
    let parent: UIViewController? = nearest is UITabBarController ? nil : nearest
    if view.superview !== host || self.parent !== parent {
      detach()
      parent?.addChild(self)
      view.backgroundColor = .clear
      view.frame = host.bounds
      view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
      host.addSubview(view)
      if parent != nil { didMove(toParent: parent) }
    }
    view.frame = host.bounds
  }

  func detach() {
    guard isAttached || parent != nil else { return }
    if parent != nil { willMove(toParent: nil) }
    view.removeFromSuperview()
    if parent != nil { removeFromParent() }
  }
}
