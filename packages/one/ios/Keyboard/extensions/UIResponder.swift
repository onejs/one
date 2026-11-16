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
    guard let superview = (self as? UIView)?.superview,
          superview.responds(to: NSSelectorFromString("nativeId"))
    else { return nil }

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

    // The dummy field's `resignFirstResponder` below ends an input session, and UIKit does that
    // synchronously: it waits for the keyboard daemon (`com.apple.TextInput.kbd`) inside
    // `UIKeyboardTaskQueue.waitUntilAllTasksAreFinished`. On a freshly booted device the daemon
    // is not running yet, and its start-up blocks the main thread for seconds (#1202).
    // A spell-check request reaches the same daemon, so start it from a background queue first.
    // The word has to be misspelled: a correctly spelled one is answered without the daemon.
    DispatchQueue.global(qos: .userInitiated).async {
      _ = UITextChecker().rangeOfMisspelledWord(
        in: "helo wrld",
        range: NSRange(location: 0, length: 9),
        startingAt: 0,
        wrap: false,
        language: "en_US"
      )

      DispatchQueue.main.async {
        guard let window = UIApplication.shared.activeWindow else { return }
        // a field is already being edited (e.g. `autoFocus`), the dummy field would steal its focus
        guard UIResponder.current == nil else { return }

        // only the dummy field's own notifications must be ignored, so the flag is scoped to them
        isKeyboardPreloading = true
        defer { isKeyboardPreloading = false }

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
}
