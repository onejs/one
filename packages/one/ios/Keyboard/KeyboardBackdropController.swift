import Foundation
import UIKit

final class KeyboardBackdropController: NSObject {
  static let shared = KeyboardBackdropController()

  private var isTranslucent = false

  override init() {
    super.init()

    NotificationCenter.default.addObserver(
      self,
      selector: #selector(keyboardWillShow(_:)),
      name: UIResponder.keyboardWillShowNotification,
      object: nil
    )
  }

  func setTranslucent(_ translucent: Bool) {
    isTranslucent = translucent
    applyTranslucency()
  }

  @objc private func keyboardWillShow(_: Notification) {
    guard isTranslucent else {
      return
    }

    applyTranslucency()
  }

  private func applyTranslucency() {
    guard let keyboardWindow = UIWindow.keyboardWindow else {
      return
    }

    applyTranslucency(in: keyboardWindow)
  }

  private func applyTranslucency(in view: UIView) {
    if isKeyboardBackdropView(view) {
      view.alpha = isTranslucent ? 0 : 1
      return
    }

    for subview in view.subviews {
      applyTranslucency(in: subview)
    }
  }

  private func isKeyboardBackdropView(_ view: UIView) -> Bool {
    let type = NSStringFromClass(type(of: view))

    return type.hasSuffix("UIKBBackdropView")
  }
}
