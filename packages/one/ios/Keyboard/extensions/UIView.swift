import Foundation
import UIKit

extension UIView {
  var reactNativeTag: NSNumber {
    return (self as UIView?).reactNativeTag
  }

  var globalFrame: CGRect? {
    let rootView = UIApplication.shared.activeWindow?.rootViewController?.view
    return superview?.convert(frame, to: rootView)
  }

  /// Location of the view inside the content of the given `UIScrollView` (the coordinate system of
  /// a `UIScrollView` is its content space), so it depends neither on the scroll position nor on
  /// where the `UIScrollView` is on the screen. `.zero` when there is no `UIScrollView`.
  func locationInScrollView(_ scrollView: UIScrollView?) -> CGPoint {
    guard let scrollView = scrollView else { return .zero }

    return convert(bounds.origin, to: scrollView)
  }

  func isVisibleInHierarchy(initial: Bool = true) -> Bool {
    guard let window = window else {
      return false
    }
    if isHidden || alpha == 0.0 {
      return false
    }
    if superview === window {
      return true
    } else if let superview = superview {
      if initial, frame.minY >= superview.frame.height {
        return false
      } else {
        return superview.isVisibleInHierarchy(initial: false)
      }
    } else {
      return false
    }
  }

  func findFirstResponder() -> UIView? {
    if isFirstResponder {
      return self
    }
    for subview in subviews {
      if let responder = subview.findFirstResponder() {
        return responder
      }
    }
    return nil
  }
}

extension Optional where Wrapped == UIView {
  var reactNativeTag: NSNumber {
      return (self?.tag ?? -1) as NSNumber
  }

  var frameTransitionInWindow: (Double, Double) {
    let areCrossFadeTransitionsEnabled = (self?.layer.presentation()?.animationKeys() ?? []).contains("opacity")
    let frameY = self?.layer.presentation()?.frame.origin.y ?? 0
    let windowH = self?.window?.bounds.size.height ?? 0
    var position = windowH - frameY

    // when cross fade transitions enabled, then keyboard changes
    // its `opacity` instead of `translateY`, so we handle it here
    if areCrossFadeTransitionsEnabled {
      let opacity = self?.layer.presentation()?.opacity ?? 0
      position = CGFloat(opacity) * position
    }

    return (position, frameY)
  }

  func isVisibleInHierarchy(initial: Bool = true) -> Bool {
    guard let view = self else {
      return false
    }
    return view.isVisibleInHierarchy(initial: initial)
  }
}
