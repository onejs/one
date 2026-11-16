import UIKit

// what the objective-c views reach in swift: lifecycle events for the
// one/keyboard module, the focused responder, and the responder swizzle.
@objc(OneKCBridge)
public final class OneKeyboardBridge: NSObject {
  static var onKeyboard: ((String, [AnyHashable: Any]) -> Void)?
  static var onFocus: ((Int, Int) -> Void)?
  static var onLayoutSync: (() -> Void)?
  static var onWindowResize: ((CGSize) -> Void)?
  static var onAnimationEnd: ((Int) -> Void)?

  @objc public static func emit(_ name: String, body: [AnyHashable: Any]?) {
    let body = body ?? [:]
    switch name {
    case "KeyboardController::focusDidSet":
      onFocus?(body["current"] as? Int ?? -1, body["count"] as? Int ?? 0)
    case "KeyboardController::layoutDidSynchronize":
      onLayoutSync?()
    case "KeyboardController::windowDidResize":
      onWindowResize?(CGSize(width: body["width"] as? Double ?? 0, height: body["height"] as? Double ?? 0))
    default:
      onKeyboard?(String(name.dropFirst("KeyboardController::".count)), body)
    }
  }

  @objc public static func animationEnded(_ viewTag: Int) {
    onAnimationEnd?(viewTag)
  }

  @objc public static var currentResponder: UIResponder? {
    UIResponder.current
  }

  @objc public static func reactTag(_ view: UIView) -> NSNumber {
    view.reactNativeTag
  }

  // the library swizzled at +load for every app linking it; One swizzles the
  // first time a keyboard gesture area mounts.
  private static let swizzled: Void = {
    UIResponder.swizzleResignFirstResponder()
    UIResponder.swizzleBecomeFirstResponder()
  }()

  @objc public static func installResponderSwizzle() {
    _ = swizzled
  }
}
