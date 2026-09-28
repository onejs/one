import NitroModules
import React
import UIKit

final class HybridOneScreenCapture: HybridOneScreenCaptureSpec {
  private var stateListeners: [UUID: (ScreenCaptureState) -> Void] = [:]
  private var screenshotListeners: [UUID: (Double) -> Void] = [:]
  private weak var observedScene: UIWindowScene?
  private var captureRegistration: (any UITraitChangeRegistration)?
  private var lastState: ScreenCaptureState?
  private var activationObserver: NSObjectProtocol?
  private var screenshotObserver: NSObjectProtocol?

  override init() {
    super.init()
    activationObserver = NotificationCenter.default.addObserver(
      forName: UIScene.didActivateNotification, object: nil, queue: .main
    ) { [weak self] _ in
      DispatchQueue.main.async { self?.observeCurrentScene() }
    }
    screenshotObserver = NotificationCenter.default.addObserver(
      forName: UIApplication.userDidTakeScreenshotNotification, object: nil, queue: .main
    ) { [weak self] _ in
      guard let self else { return }
      let timestampMs = Date().timeIntervalSince1970 * 1000
      for listener in self.screenshotListeners.values {
        listener(timestampMs)
      }
    }
  }

  deinit {
    if let activationObserver { NotificationCenter.default.removeObserver(activationObserver) }
    if let screenshotObserver { NotificationCenter.default.removeObserver(screenshotObserver) }
    if let observedScene, let captureRegistration {
      DispatchQueue.main.async {
        observedScene.unregisterForTraitChanges(captureRegistration)
      }
    }
  }

  func getState() throws -> Promise<ScreenCaptureState> {
    let promise = Promise<ScreenCaptureState>()
    DispatchQueue.main.async {
      guard let scene = Self.currentScene() else {
        promise.reject(withError: oneNativeError(
          "E_SCREEN_CAPTURE_SCENE", "ScreenCapture.getState: no active window scene"))
        return
      }
      self.observe(scene)
      promise.resolve(withResult: Self.state(scene.traitCollection.sceneCaptureState))
    }
    return promise
  }

  func addStateListener(onChange: @escaping (ScreenCaptureState) -> Void) throws -> () -> Void {
    let id = UUID()
    DispatchQueue.main.async {
      self.stateListeners[id] = onChange
      self.observeCurrentScene()
    }
    return { [weak self] in
      DispatchQueue.main.async { self?.stateListeners.removeValue(forKey: id) }
    }
  }

  func addScreenshotListener(onScreenshot: @escaping (Double) -> Void) throws -> () -> Void {
    let id = UUID()
    DispatchQueue.main.async { self.screenshotListeners[id] = onScreenshot }
    return { [weak self] in
      DispatchQueue.main.async { self?.screenshotListeners.removeValue(forKey: id) }
    }
  }

  @MainActor private func observeCurrentScene() {
    guard let scene = Self.currentScene() else { return }
    observe(scene)
  }

  @MainActor private func observe(_ scene: UIWindowScene) {
    guard observedScene !== scene else { return }
    if let observedScene, let captureRegistration {
      observedScene.unregisterForTraitChanges(captureRegistration)
    }
    observedScene = scene
    lastState = Self.state(scene.traitCollection.sceneCaptureState)
    captureRegistration = scene.registerForTraitChanges([UITraitSceneCaptureState.self]) {
      [weak self, weak scene] (_: UIWindowScene, _: UITraitCollection) in
      guard let self, let scene else { return }
      DispatchQueue.main.async { self.deliver(scene) }
    }
  }

  @MainActor private func deliver(_ scene: UIWindowScene) {
    guard observedScene === scene else { return }
    let state = Self.state(scene.traitCollection.sceneCaptureState)
    guard state.stringValue != lastState?.stringValue else { return }
    lastState = state
    for listener in stateListeners.values { listener(state) }
  }

  private static func currentScene() -> UIWindowScene? {
    RCTKeyWindow()?.windowScene
  }

  private static func state(_ value: UISceneCaptureState) -> ScreenCaptureState {
    switch value {
    case .active: return .active
    case .inactive: return .inactive
    case .unspecified: return .unspecified
    @unknown default: return .unspecified
    }
  }
}
