import Foundation
import UIKit

extension UIResponder {
  static var current: UIResponder? {
    guard let window = UIApplication.shared.activeWindow else { return nil }
    return window.findFirstResponder()
  }
}

extension Optional where Wrapped: UIResponder {
  var reactViewTag: NSNumber {
    return ((self as? UIView)?.superview).reactNativeTag
  }

  var nativeID: String? {
    guard let superview = (self as? UIView)?.superview else { return nil }

      return superview.safeValue(forKey: "nativeId") as? String
  }
}

extension Optional where Wrapped: UIResponder {
  var parentScrollView: UIScrollView? {
    var currentResponder: UIResponder? = self

    while let currentView = currentResponder {
      // If the current responder is a vertical, scrollable UIScrollView (excluding UITextView), return it
      if let scrollView = currentView as? UIScrollView,
         !(currentView is UITextView),
         scrollView.frame.width >= scrollView.contentSize.width,
         scrollView.isScrollEnabled
      {
        return scrollView
      }

      // Move to the next responder in the chain
      currentResponder = currentView.next
    }

    // UIScrollView is not found
    return nil
  }
}

extension UIResponder {
  private static var hasPreloadedKeyboard = false
  static var isKeyboardPreloading = false

  /// Preloads the keyboard UI to reduce first-time lag when showing a keyboard.
  /// https://stackoverflow.com/questions/9357026/super-slow-lag-delay-on-initial-keyboard-animation-of-uitextfield/20436797#20436797
  static func preloadKeyboardIfNeeded() {
    guard !hasPreloadedKeyboard else { return }
    hasPreloadedKeyboard = true
    isKeyboardPreloading = true

    DispatchQueue.main.async {
      defer { isKeyboardPreloading = false }
      guard let window = UIApplication.shared.activeWindow else { return }
      // a field is already being edited (e.g. `autoFocus`), the dummy field would steal its focus
      guard UIResponder.current == nil else { return }

      let lagFreeField = UITextField(frame: .zero)
      lagFreeField.isHidden = true
      window.addSubview(lagFreeField)

      lagFreeField.becomeFirstResponder()
      UIView.performWithoutAnimation {
        lagFreeField.resignFirstResponder()
      }
      lagFreeField.removeFromSuperview()
    }
  }
}
