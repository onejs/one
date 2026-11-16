import Foundation
import UIKit

private var pendingBecomeResponder: TextInput?
private weak var pendingResignResponder: UIResponder?
private var originalResignFirstResponder: IMP?
private var originalBecomeFirstResponder: IMP?

extension UIResponder {
  static func swizzleBecomeFirstResponder() {
    let originalBecomeSelector = #selector(becomeFirstResponder)
    guard
      let originalBecomeMethod = class_getInstanceMethod(UIResponder.self, originalBecomeSelector)
    else {
      return
    }

    originalBecomeFirstResponder = method_getImplementation(originalBecomeMethod)

    let swizzledBecomeImplementation: @convention(block) (UIResponder) -> Bool = { (self) in
      pendingBecomeResponder = self as? TextInput

      DispatchQueue.main.asyncAfter(deadline: .now() + UIUtils.nextFrame) {
        pendingBecomeResponder = nil
      }

      return self.callOriginalBecomeFirstResponder(originalBecomeSelector)
    }

    let implementation = imp_implementationWithBlock(swizzledBecomeImplementation)
    method_setImplementation(originalBecomeMethod, implementation)
  }

  static func swizzleResignFirstResponder() {
    let originalResignSelector = #selector(resignFirstResponder)

    guard
      let originalResignMethod = class_getInstanceMethod(UIResponder.self, originalResignSelector)
    else {
      return
    }

    originalResignFirstResponder = method_getImplementation(originalResignMethod)

    let swizzledResignImplementation: @convention(block) (UIResponder) -> Bool = { (self) in
      // Check the type of responder
      if let textField = self as? TextInput {
        // check inputAccessoryView and call original method immediately if not InvisibleInputAccessoryView
        if !(textField.inputAccessoryView is InvisibleInputAccessoryView) {
          return self.callOriginalResignFirstResponder(originalResignSelector)
        } else if pendingBecomeResponder != nil {
          // if we already have a new focus request
          pendingBecomeResponder = nil
          KeyboardAreaExtender.shared.hide()
          (self as? TextInput)?.inputAccessoryView = nil
          KeyboardAreaExtender.shared.remove()
          return self.callOriginalResignFirstResponder(originalResignSelector)
        }
      } else {
        // If casting to TextInput fails
        return self.callOriginalResignFirstResponder(originalResignSelector)
      }

      KeyboardAreaExtender.shared.hide()
      pendingResignResponder = self

      // Postpone execution of the original resignFirstResponder
      DispatchQueue.main.asyncAfter(deadline: .now() + UIUtils.nextFrame) {
        if pendingResignResponder === self {
          pendingResignResponder = nil
        }
        NotificationCenter.default.post(
          name: .shouldIgnoreKeyboardEvents, object: nil, userInfo: ["ignore": false]
        )
        (self as? TextInput)?.inputAccessoryView = nil
        KeyboardAreaExtender.shared.remove()
        _ = self.callOriginalResignFirstResponder(originalResignSelector)
      }

      // We need to return a value immediately, even though the actual action is delayed
      return false
    }

    let implementation = imp_implementationWithBlock(swizzledResignImplementation)
    method_setImplementation(originalResignMethod, implementation)

    swizzleWillMoveToWindow(originalResignSelector)
  }

  /// If an input with a postponed resign is about to leave its window (native-stack pop on iOS 26+,
  /// unmount, etc.), then the postponed resign will fail, because input will not be attached to the
  /// window anymore, and window will keep a stale first responder. So we resign it immediately while
  /// input is still attached.
  private static func swizzleWillMoveToWindow(_ resignSelector: Selector) {
    let selector = #selector(UIView.willMove(toWindow:))

    for cls in [UITextView.self, UITextField.self] as [AnyClass] {
      guard let method = class_getInstanceMethod(cls, selector) else { continue }

      // may be inherited from `UIView` - we add own method to the class in this case,
      // so the change doesn't affect all views
      let originalImplementation = method_getImplementation(method)
      typealias Function = @convention(c) (AnyObject, Selector, UIWindow?) -> Void
      let castOriginalImplementation = unsafeBitCast(originalImplementation, to: Function.self)

      let swizzledImplementation: @convention(block) (UIView, UIWindow?) -> Void = { view, newWindow in
        if newWindow !== view.window, pendingResignResponder === view {
          pendingResignResponder = nil
          NotificationCenter.default.post(
            name: .shouldIgnoreKeyboardEvents, object: nil, userInfo: ["ignore": false]
          )
          (view as? TextInput)?.inputAccessoryView = nil
          KeyboardAreaExtender.shared.remove()
          _ = view.callOriginalResignFirstResponder(resignSelector)
        }

        castOriginalImplementation(view, selector, newWindow)
      }

      let implementation = imp_implementationWithBlock(swizzledImplementation)
      if !class_addMethod(cls, selector, implementation, method_getTypeEncoding(method)) {
        method_setImplementation(method, implementation)
      }
    }
  }

  private func callOriginalResignFirstResponder(_ selector: Selector) -> Bool {
    guard let originalResignFirstResponder = originalResignFirstResponder else { return false }
    typealias Function = @convention(c) (AnyObject, Selector) -> Bool
    let castOriginalResignFirstResponder = unsafeBitCast(
      originalResignFirstResponder, to: Function.self
    )
    return castOriginalResignFirstResponder(self, selector)
  }

  private func callOriginalBecomeFirstResponder(_ selector: Selector) -> Bool {
    guard let originalBecomeFirstResponder = originalBecomeFirstResponder else { return false }
    typealias Function = @convention(c) (AnyObject, Selector) -> Bool
    let castOriginalBecomeFirstResponder = unsafeBitCast(
      originalBecomeFirstResponder, to: Function.self
    )
    return castOriginalBecomeFirstResponder(self, selector)
  }
}
