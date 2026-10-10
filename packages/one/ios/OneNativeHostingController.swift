import SwiftUI
import UIKit

final class OneNativeHostingController<Content: View>: UIHostingController<Content> {
  var isAttached: Bool { view.superview != nil }

  // react native placed the host's box, so by default the hosted view ignores the insets
  // it would inherit from the screen. uikit computes them from where the box sits when it
  // lays out, and a transform moving the box never lays it out again: a control that
  // mounts under the status bar (a toast entering from off screen) keeps its content
  // inset out of the box. screen chrome that sits against those edges (a navigation
  // stack's bar, a tab bar, a sheet) passes screenInsets to keep them.
  init(rootView: Content, screenInsets: Bool = false) {
    super.init(rootView: rootView)
    if !screenInsets { safeAreaRegions = [] }
  }

  @available(*, unavailable)
  required init?(coder: NSCoder) { fatalError("init(coder:) is not supported") }

  // the parent is the view controller whose view is the nearest ancestor of the host,
  // the first view controller on the responder chain: uikit resolves that same
  // controller when the hosted view is added and raises
  // UIViewControllerHierarchyInconsistency for any other parent, so the parent is
  // never redirected. two controllers cannot take the child at all, because their
  // children are their content: a UITabBarController's children are its tabs, and
  // react-native-screens casts every one of them to a tab screen; a
  // UINavigationController's children are its stack, so addChild pushes the host
  // as a new screen with an empty bar and a back button. a host inside either
  // controller's own chrome (a bottom accessory, a navigation bar item) is hosted
  // without containment, as a plain subview.
  func attach(to host: UIView) {
    guard host.window != nil else { detach(); return }
    var responder: UIResponder? = host.next
    while responder != nil && !(responder is UIViewController) { responder = responder?.next }
    let nearest = responder as? UIViewController
    let parent: UIViewController? =
      (nearest == nil || nearest is UITabBarController || nearest is UINavigationController)
      ? nil : nearest
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
