import Foundation
import UIKit

@objc(OneKCModuleImpl)
public class KeyboardControllerModuleImpl: NSObject {
  private static let keyboardRevealGestureName = "keyboardRevealGesture"

  @objc
  public static func setTranslucent(_ translucent: Bool) {
    KeyboardBackdropController.shared.setTranslucent(translucent)
  }

  @objc
  public static func dismiss(_ keepFocus: Bool, animated: Bool) {
    let work = {
      let responder = UIResponder.current

      if keepFocus {
        guard let input = responder as? TextInput else { return }
        let tapGesture = UITapGestureRecognizer(target: self, action: #selector(onTextInputTapped(_:)))
        tapGesture.name = keyboardRevealGestureName
        input.addGestureRecognizer(tapGesture)

        input.inputView = UIView()
        input.reloadInputViews()

        NotificationCenter.default.addObserver(
          self,
          selector: #selector(onResponderResigned(_:)),
          name: UITextField.textDidEndEditingNotification,
          object: input
        )
      } else {
        responder?.resignFirstResponder()
      }
    }

    if !animated {
      UIView.performWithoutAnimation {
        work()
      }
    } else {
      work()
    }
  }

  @objc static func onTextInputTapped(_ gesture: UITapGestureRecognizer) {
    if gesture.state == .ended {
      guard let input = UIResponder.current as? TextInput else { return }

      cleanup(input)

      input.becomeFirstResponder()
    }
  }

  @objc static func onResponderResigned(_ notification: Notification) {
    guard let input = notification.object as? TextInput else { return }

    cleanup(input)
  }

  static func cleanup(_ input: TextInput) {
    input.inputView = nil
    input.reloadInputViews()

    if let gestures = input.gestureRecognizers {
      for gesture in gestures where gesture.name == keyboardRevealGestureName {
        input.removeGestureRecognizer(gesture)
      }
    }

    NotificationCenter.default.removeObserver(self, name: UITextField.textDidEndEditingNotification, object: input)
  }
}
