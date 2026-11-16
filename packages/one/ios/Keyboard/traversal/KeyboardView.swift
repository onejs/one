import Foundation
import UIKit

enum KeyboardView {
  private static let windowPrefix = "<UITextEffectsWindow"
  private static let containerPrefixes = ["<UIInputSetContainerView", "<UITrackingWindowView"]
  private static let hostPrefixes = ["<UIInputSetHostView", "<UIKeyboardItemContainerView"]
  /// inspired by https://stackoverflow.com/questions/32598490/show-uiview-with-buttons-over-keyboard-like-in-skype-viber-messengers-swift-i
  static func find() -> UIView? {
    let windows = UIApplication.shared.windows
    for window in windows {
      if window.description.hasPrefix(windowPrefix) {
        for subview in window.subviews {
          if subview.description.hasAnyPrefix(containerPrefixes) {
            for hostView in subview.subviews {
              if hostView.description.hasAnyPrefix(hostPrefixes), hostView.frame.height != 0 {
                return hostView
              }
            }
            break
          }
        }
      }
    }

    return nil
  }
}
