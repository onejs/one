import Foundation
import ObjectiveC
import UIKit

extension UIWindow {
  static let sharedKeyboardWindowObserver = KeyboardWindowObserver()

  class KeyboardWindowObserver: NSObject {
    weak var keyboardWindow: UIWindow?

    override init() {
      super.init()
      NotificationCenter.default.addObserver(
        self,
        selector: #selector(windowDidBecomeVisible(_:)),
        name: UIWindow.didBecomeVisibleNotification,
        object: nil
      )
    }

    @objc private func windowDidBecomeVisible(_ notification: Notification) {
      guard let window = notification.object as? UIWindow else { return }

      // Check if the window is of UIRemoteKeyboardWindow class
      let type = String(describing: window)
      if type.range(of: "UIRemoteKeyboardWindow") != nil {
        keyboardWindow = window
      }
    }

    func getTopWindow() -> UIWindow? {
      let keyboardView = KeyboardView.find()
      // return the keyboard window if it's available and keyboard is visible, otherwise return the last window
      let keyboardWindow = UIWindow.keyboardWindow
      return (keyboardWindow != nil && keyboardView.isVisibleInHierarchy())
        ? keyboardWindow
        : UIApplication.shared.activeWindow
    }
  }

  // the observer starts on first use instead of at app load, so a keyboard
  // window shown before then is found among the scene's windows.
  static var keyboardWindow: UIWindow? {
    if let window = sharedKeyboardWindowObserver.keyboardWindow { return window }
    let window = UIApplication.shared.connectedScenes
      .compactMap { ($0 as? UIWindowScene)?.windows }
      .joined()
      .first { String(describing: type(of: $0)).contains("UIRemoteKeyboardWindow") }
    sharedKeyboardWindowObserver.keyboardWindow = window
    return window
  }

  static var topWindow: UIWindow? {
    return sharedKeyboardWindowObserver.getTopWindow()
  }
}
