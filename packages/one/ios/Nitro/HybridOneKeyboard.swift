import NitroModules
import UIKit

// the module half of one/keyboard. the views and observers it reads live in
// ios/Keyboard, folded in from react-native-keyboard-controller.
final class HybridOneKeyboard: HybridOneKeyboardSpec {
  private var keyboardListeners: [Int: (OneKeyboardEventName, OneKeyboardEvent) -> Void] = [:]
  private var focusListeners: [Int: (OneKeyboardFocus) -> Void] = [:]
  private var layoutSyncListeners: [Int: () -> Void] = [:]
  private var windowListeners: [Int: (Double, Double) -> Void] = [:]
  private var animationEndListeners: [Int: (Double) -> Void] = [:]
  private var nextListenerId = 0
  private var preloadRequested = false

  override init() {
    super.init()
    OneKeyboardBridge.onKeyboard = { [weak self] name, body in
      guard let self, let name = OneKeyboardEventName(fromString: name) else { return }
      let event = OneKeyboardEvent(
        height: body["height"] as? Double ?? 0,
        duration: Double(body["duration"] as? Int ?? 0),
        timestamp: body["timestamp"] as? Double ?? 0,
        target: (body["target"] as? NSNumber)?.doubleValue ?? -1,
        type: body["type"] as? String ?? "default",
        appearance: body["appearance"] as? String ?? "light")
      for listener in self.keyboardListeners.values { listener(name, event) }
    }
    OneKeyboardBridge.onFocus = { [weak self] current, count in
      let event = OneKeyboardFocus(current: Double(current), count: Double(count))
      for listener in self?.focusListeners.values ?? [:].values { listener(event) }
    }
    OneKeyboardBridge.onLayoutSync = { [weak self] in
      for listener in self?.layoutSyncListeners.values ?? [:].values { listener() }
    }
    OneKeyboardBridge.onWindowResize = { [weak self] size in
      for listener in self?.windowListeners.values ?? [:].values {
        listener(Double(size.width), Double(size.height))
      }
    }
    OneKeyboardBridge.onAnimationEnd = { [weak self] tag in
      for listener in self?.animationEndListeners.values ?? [:].values { listener(Double(tag)) }
    }
  }

  var keyboardBorderRadius: Double {
    Double(KeyboardExtenderContainerView.keyboardBorderRadius())
  }

  // warming the keyboard focuses a hidden field, which holds the main thread
  // for about 160 ms, so it waits until the launch screen is gone and the
  // first screen has had a second to settle.
  func preload() throws {
    DispatchQueue.main.async {
      guard !self.preloadRequested else { return }
      self.preloadRequested = true
      OneLaunchScreenAfterRelease {
        DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
          UIResponder.preloadKeyboardIfNeeded()
        }
      }
    }
  }

  func dismiss(keepFocus: Bool, animated: Bool) throws {
    DispatchQueue.main.async {
      KeyboardControllerModuleImpl.dismiss(keepFocus, animated: animated)
    }
  }

  func setFocusTo(direction: String) throws {
    DispatchQueue.main.async {
      ViewHierarchyNavigator.setFocusTo(direction: direction)
    }
  }

  func setTranslucent(translucent: Bool) throws {
    DispatchQueue.main.async {
      KeyboardControllerModuleImpl.setTranslucent(translucent)
    }
  }

  func viewPositionInWindow(viewTag: Double) throws -> Promise<OneKeyboardFrame> {
    let promise = Promise<OneKeyboardFrame>()
    // layout events can precede fabric mounting, so allow a display interval
    // before the only lookup.
    DispatchQueue.main.asyncAfter(deadline: .now() + UIUtils.nextFrame) {
      guard
        let view = UIApplication.shared.activeWindow?.viewWithTag(Int(viewTag)),
        let superview = view.superview
      else {
        promise.reject(withError: RuntimeError.error(withMessage: "Could not find view for tag \(Int(viewTag))"))
        return
      }
      let frame = superview.convert(view.frame, to: nil)
      promise.resolve(withResult: OneKeyboardFrame(
        x: frame.origin.x, y: frame.origin.y, width: frame.width, height: frame.height))
    }
    return promise
  }

  func addKeyboardListener(
    listener: @escaping (OneKeyboardEventName, OneKeyboardEvent) -> Void
  ) throws -> () -> Void {
    add(listener, to: \.keyboardListeners)
  }

  func addFocusListener(listener: @escaping (OneKeyboardFocus) -> Void) throws -> () -> Void {
    add(listener, to: \.focusListeners)
  }

  func addLayoutSyncListener(listener: @escaping () -> Void) throws -> () -> Void {
    add(listener, to: \.layoutSyncListeners)
  }

  func addWindowResizeListener(listener: @escaping (Double, Double) -> Void) throws -> () -> Void {
    add(listener, to: \.windowListeners)
  }

  func addAnimationEndListener(listener: @escaping (Double) -> Void) throws -> () -> Void {
    add(listener, to: \.animationEndListeners)
  }

  // listeners are added, called and removed on main, where the views emit.
  private func add<Listener>(
    _ listener: Listener,
    to listeners: ReferenceWritableKeyPath<HybridOneKeyboard, [Int: Listener]>
  ) -> () -> Void {
    let id = nextListenerId
    nextListenerId += 1
    DispatchQueue.main.async { self[keyPath: listeners][id] = listener }
    return { [weak self] in
      DispatchQueue.main.async { self?[keyPath: listeners][id] = nil }
    }
  }
}
