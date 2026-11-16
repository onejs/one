import Foundation
import UIKit

@objc(OneKCKeyboardMovementObserver)
public class KeyboardMovementObserver: NSObject {
  // class members
  var onEvent: (NSString, NSNumber, NSNumber, NSNumber, NSNumber) -> Void
  var onNotify: (String, Any) -> Void
  // animation
  var onRequestAnimation: () -> Void
  var onCancelAnimation: () -> Void
  // progress tracker
  @objc public var keyboardTrackingView = KeyboardTrackingView()
  var animation: KeyboardAnimation?

  var prevKeyboardPosition = 0.0
  var displayLink: CADisplayLink!
  var interactiveKeyboardObserver: NSKeyValueObservation?
  var isMounted = false
  // state variables
  private var _keyboardHeight: CGFloat = 0.0
  var keyboardHeight: CGFloat {
    get { _keyboardHeight - KeyboardAreaExtender.shared.offset }
    set { _keyboardHeight = newValue }
  }

  var duration = 0
  var tag: NSNumber = -1
  // manual did events
  var notification: Notification?
  var keyboardDidTask: DispatchWorkItem?

  @objc public init(
    handler: @escaping (NSString, NSNumber, NSNumber, NSNumber, NSNumber) -> Void,
    onNotify: @escaping (String, Any) -> Void,
    onRequestAnimation: @escaping () -> Void,
    onCancelAnimation: @escaping () -> Void
  ) {
    onEvent = handler
    self.onNotify = onNotify
    self.onRequestAnimation = onRequestAnimation
    self.onCancelAnimation = onCancelAnimation

    super.init()

    displayLink = CADisplayLink(target: self, selector: #selector(updateKeyboardFrame))
    displayLink.preferredFramesPerSecond = 120 // will fallback to 60 fps for devices without Pro Motion display
    displayLink.add(to: .main, forMode: .common)
    displayLink.isPaused = true
  }

  deinit {
    displayLink.invalidate()
    displayLink = nil
    NotificationCenter.default.removeObserver(self)
  }
}
