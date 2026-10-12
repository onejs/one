import Foundation
import NitroModules
import UIKit

final class HybridOneScreenCapture: HybridOneScreenCaptureSpec {
  private var stateListeners: [UUID: (ScreenCaptureState) -> Void] = [:]
  private var screenshotListeners: [UUID: (Double) -> Void] = [:]
  private weak var observedScene: UIWindowScene?
  private var captureRegistration: (any UITraitChangeRegistration)?
  private var lastState: ScreenCaptureState?
  private var activationObserver: NSObjectProtocol?
  private var screenshotObserver: NSObjectProtocol?
  // screenshot and recording prevention, mirroring expo-screen-capture:
  // screenshots hide behind a secure-entry text field canvas layer, and
  // recordings hide behind a black block view while the scene is captured.
  private var preventionActive = false
  private var secureField: UITextField?
  private var secureOriginalParent: CALayer?
  private weak var secureWindow: UIWindow?
  private var blockView: UIView?
  private weak var blockWindow: UIWindow?
  private var capturedObserver: NSObjectProtocol?
  private var keyWindowObserver: NSObjectProtocol?

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
    if let capturedObserver { NotificationCenter.default.removeObserver(capturedObserver) }
    if let keyWindowObserver { NotificationCenter.default.removeObserver(keyWindowObserver) }
    // prevention re-parents the window layer, so restore it even when the
    // hybrid dies while armed; capture values instead of self.
    let field = secureField
    let window = secureWindow
    let parent = secureOriginalParent
    let overlay = blockView
    DispatchQueue.main.async {
      if let window {
        window.layer.removeFromSuperlayer()
        if let parent { parent.addSublayer(window.layer) }
      }
      field?.layer.removeFromSuperlayer()
      overlay?.removeFromSuperview()
    }
    if let observedScene, let captureRegistration {
      DispatchQueue.main.async {
        observedScene.unregisterForTraitChanges(captureRegistration)
      }
    }
  }

  func getState() throws -> Promise<ScreenCaptureState> {
    let promise = Promise<ScreenCaptureState>()
    DispatchQueue.main.async {
      guard let scene = self.currentScene() else {
        promise.reject(withError: oneNativeError(
          "E_SCREEN_CAPTURE_SCENE", "ScreenCapture.getState: no active window scene"))
        return
      }
      self.observe(scene)
      promise.resolve(withResult: Self.state(scene.traitCollection.sceneCaptureState))
    }
    return promise
  }

  func captureWindow() throws -> Promise<ScreenCaptureResult> {
    let promise = Promise<ScreenCaptureResult>()
    DispatchQueue.main.async {
      guard let window = self.currentWindow(), window.windowScene != nil else {
        promise.reject(withError: oneNativeError(
          "E_SCREEN_CAPTURE_SCENE", "ScreenCapture.captureWindow: no active app window scene"))
        return
      }
      do {
        promise.resolve(withResult: try Self.render(window, scale: window.screen.scale, operation: "captureWindow"))
      } catch {
        promise.reject(withError: error)
      }
    }
    return promise
  }

  func captureView(viewTag: Double) throws -> Promise<ScreenCaptureResult> {
    let promise = Promise<ScreenCaptureResult>()
    DispatchQueue.main.async {
      guard viewTag.isFinite, viewTag >= 1, viewTag <= Double(Int32.max),
        viewTag.rounded(.towardZero) == viewTag else {
        promise.reject(withError: oneNativeError(
          "E_SCREEN_CAPTURE_INPUT", "ScreenCapture.captureView: view tag must be a positive 32-bit integer"))
        return
      }
      guard let window = self.currentWindow(), window.windowScene != nil else {
        promise.reject(withError: oneNativeError(
          "E_SCREEN_CAPTURE_SCENE", "ScreenCapture.captureView: no active app window scene"))
        return
      }
      guard let view = window.viewWithTag(Int(viewTag)), view !== window, view.window === window else {
        promise.reject(withError: oneNativeError(
          "E_SCREEN_CAPTURE_VIEW", "ScreenCapture.captureView: mounted view tag was not found in the app window"))
        return
      }
      do {
        promise.resolve(withResult: try Self.render(view, scale: window.screen.scale, operation: "captureView"))
      } catch {
        promise.reject(withError: error)
      }
    }
    return promise
  }

  @MainActor private static func render(_ view: UIView, scale: CGFloat, operation: String) throws -> ScreenCaptureResult {
    guard !view.bounds.isEmpty else {
      throw oneNativeError("E_SCREEN_CAPTURE_RENDER", "ScreenCapture.\(operation): view has no drawable area")
    }
    let format = UIGraphicsImageRendererFormat.default()
    format.scale = scale
    var didDraw = false
    let image = UIGraphicsImageRenderer(bounds: view.bounds, format: format).image { _ in
      didDraw = view.drawHierarchy(in: view.bounds, afterScreenUpdates: true)
    }
    guard didDraw else {
      throw oneNativeError("E_SCREEN_CAPTURE_RENDER", "ScreenCapture.\(operation): view could not be rendered")
    }
    guard let data = image.pngData(), let cgImage = image.cgImage else {
      throw oneNativeError("E_SCREEN_CAPTURE_ENCODE", "ScreenCapture.\(operation): PNG encoding failed")
    }
    let folder = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0]
      .appendingPathComponent("OneScreenCapture", isDirectory: true)
    let destination = folder.appendingPathComponent(UUID().uuidString).appendingPathExtension("png")
    do {
      try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
      try data.write(to: destination, options: .atomic)
    } catch {
      try? FileManager.default.removeItem(at: destination)
      throw oneNativeError("E_SCREEN_CAPTURE_FILE", "ScreenCapture.\(operation): PNG file could not be saved")
    }
    return ScreenCaptureResult(
      uri: destination.absoluteString,
      width: Double(cgImage.width),
      height: Double(cgImage.height),
      size: Double(data.count))
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

  func prevent() throws -> Promise<Void> {
    let promise = Promise<Void>()
    DispatchQueue.main.async {
      guard let window = self.currentWindow(), window.windowScene != nil else {
        promise.reject(withError: oneNativeError(
          "E_SCREEN_CAPTURE_SCENE", "ScreenCapture.prevent: no active app window"))
        return
      }
      do {
        try self.attachSecureCanvas(to: window)
      } catch {
        promise.reject(withError: error)
        return
      }
      self.preventionActive = true
      self.observeCurrentScene()
      self.ensureCapturedObserver()
      self.ensureKeyWindowObserver()
      self.updateBlockView()
      promise.resolve(withResult: ())
    }
    return promise
  }

  func allow() throws -> Promise<Void> {
    let promise = Promise<Void>()
    DispatchQueue.main.async {
      self.preventionActive = false
      self.detachSecureCanvas()
      self.removeBlockView()
      self.removePreventionObservers()
      promise.resolve(withResult: ())
    }
    return promise
  }

  func isPrevented() throws -> Promise<Bool> {
    let promise = Promise<Bool>()
    DispatchQueue.main.async {
      promise.resolve(withResult: self.preventionActive)
    }
    return promise
  }

  // screenshots render the window layer blank once it lives under a
  // secure-entry text field canvas layer. the attach either fully moves the
  // layer or throws without mutating the hierarchy. main thread only.
  @MainActor private func attachSecureCanvas(to window: UIWindow) throws {
    if let secureWindow, secureWindow === window, secureField?.layer.superlayer != nil {
      return
    }
    detachSecureCanvas()
    guard let originalParent = window.layer.superlayer else {
      throw oneNativeError(
        "E_SCREEN_CAPTURE_SCENE", "ScreenCapture.prevent: app window cannot be protected")
    }
    let field = UITextField()
    field.isSecureTextEntry = true
    field.isUserInteractionEnabled = false
    field.backgroundColor = .clear
    field.frame = window.bounds
    originalParent.addSublayer(field.layer)
    guard let canvasLayer = field.layer.sublayers?.first else {
      field.layer.removeFromSuperlayer()
      throw oneNativeError(
        "E_SCREEN_CAPTURE_RENDER", "ScreenCapture.prevent: secure layer is unavailable")
    }
    window.layer.removeFromSuperlayer()
    canvasLayer.addSublayer(window.layer)
    secureField = field
    secureOriginalParent = originalParent
    secureWindow = window
  }

  @MainActor private func detachSecureCanvas() {
    defer {
      secureField?.layer.removeFromSuperlayer()
      secureField = nil
      secureOriginalParent = nil
      secureWindow = nil
    }
    guard let window = secureWindow else { return }
    window.layer.removeFromSuperlayer()
    if let originalParent = secureOriginalParent {
      originalParent.addSublayer(window.layer)
    }
  }

  @MainActor private func ensureCapturedObserver() {
    guard capturedObserver == nil else { return }
    capturedObserver = NotificationCenter.default.addObserver(
      forName: UIScreen.capturedDidChangeNotification, object: nil, queue: .main
    ) { [weak self] _ in
      DispatchQueue.main.async { self?.updateBlockView() }
    }
  }

  @MainActor private func ensureKeyWindowObserver() {
    guard keyWindowObserver == nil else { return }
    keyWindowObserver = NotificationCenter.default.addObserver(
      forName: UIWindow.didBecomeKeyNotification, object: nil, queue: .main
    ) { [weak self] notification in
      DispatchQueue.main.async {
        guard let self, self.preventionActive else { return }
        let window = (notification.object as? UIWindow) ?? self.currentWindow()
        guard let window, window.windowScene != nil else { return }
        try? self.attachSecureCanvas(to: window)
        self.observeCurrentScene()
        self.updateBlockView()
      }
    }
  }

  @MainActor private func removePreventionObservers() {
    if let capturedObserver {
      NotificationCenter.default.removeObserver(capturedObserver)
      self.capturedObserver = nil
    }
    if let keyWindowObserver {
      NotificationCenter.default.removeObserver(keyWindowObserver)
      self.keyWindowObserver = nil
    }
  }

  // recordings and mirroring hide behind a black overlay on the protected
  // window while the scene reports captured. idempotent: repeated trait and
  // captured notifications converge on the same overlay. main thread only.
  @MainActor private func updateBlockView() {
    guard preventionActive, isCaptureActive(), let window = secureWindow ?? currentWindow() else {
      removeBlockView()
      return
    }
    if let blockView, blockView.superview != nil, blockWindow === window {
      blockView.frame = window.bounds
      return
    }
    removeBlockView()
    let overlay = UIView(frame: window.bounds)
    overlay.backgroundColor = .black
    overlay.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    overlay.isUserInteractionEnabled = false
    window.addSubview(overlay)
    window.bringSubviewToFront(overlay)
    blockView = overlay
    blockWindow = window
  }

  @MainActor private func removeBlockView() {
    blockView?.removeFromSuperview()
    blockView = nil
    blockWindow = nil
  }

  // the overlay covers the window while the platform reports capture: the
  // screen's own captured flag (UIScreen.isCaptured, mirrored from the sdk)
  // or the scene's capture trait, the same signal getState() reports. either
  // genuine capture signal hides content; neither is invented.
  @MainActor private func isCaptureActive() -> Bool {
    let scene = secureWindow?.windowScene ?? currentScene()
    if scene?.screen.isCaptured == true { return true }
    return scene?.traitCollection.sceneCaptureState == .active
  }

  @MainActor private func observeCurrentScene() {
    guard let scene = currentScene() else { return }
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
    if preventionActive { updateBlockView() }
    guard state.stringValue != lastState?.stringValue else { return }
    lastState = state
    for listener in stateListeners.values { listener(state) }
  }

  @MainActor private func currentWindow() -> UIWindow? {
    let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
    let activeScene = scenes.first(where: { $0.activationState == .foregroundActive })
    let pinnedScene = observedScene?.activationState == .unattached ? nil : observedScene
    let windows = (activeScene ?? pinnedScene ?? scenes.first)?.windows ?? []
    return windows.first(where: { $0.isKeyWindow && $0.windowLevel == .normal && $0.rootViewController != nil }) ??
      windows.first(where: { !$0.isHidden && $0.windowLevel == .normal && $0.rootViewController != nil }) ??
      windows.first(where: { $0.isKeyWindow }) ?? windows.first
  }

  @MainActor private func currentScene() -> UIWindowScene? {
    let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
    return currentWindow()?.windowScene ??
      scenes.first(where: { $0.activationState == .foregroundActive }) ?? scenes.first
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
