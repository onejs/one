import Foundation
import UIKit

public protocol TextInput: UIView {
  // default common methods/properties
  var inputAccessoryView: UIView? { get set }
  var inputView: UIView? { get set }
  var keyboardType: UIKeyboardType { get }
  var keyboardAppearance: UIKeyboardAppearance { get }
  /// custom methods/properties
  func focus()
}

extension UITextField: TextInput {
  public func focus() {
    becomeFirstResponder()
  }
}

extension UITextView: TextInput {
  public func focus() {
    becomeFirstResponder()
  }
}

extension TextInput {
  var keyboardAppearanceValue: String {
    switch keyboardAppearance {
    case .dark:
      return "dark"
    case .light:
      return "light"
    case .default:
      if #available(iOS 12.0, *) {
        switch traitCollection.userInterfaceStyle {
        case .dark:
          return "dark"
        case .light, .unspecified:
          return "light"
        @unknown default:
          return "light"
        }
      } else {
        return "light" // Default fallback for iOS < 12
      }
    @unknown default:
      return "light"
    }
  }
}
