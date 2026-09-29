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

  func captureWindow() throws -> Promise<WindowCaptureResult> {
    let promise = Promise<WindowCaptureResult>()
    DispatchQueue.main.async {
      guard let window = self.currentWindow(), window.windowScene != nil else {
        promise.reject(withError: oneNativeError(
          "E_SCREEN_CAPTURE_SCENE", "ScreenCapture.captureWindow: no active app window scene"))
        return
      }
      guard !window.bounds.isEmpty else {
        promise.reject(withError: oneNativeError(
          "E_SCREEN_CAPTURE_RENDER", "ScreenCapture.captureWindow: window has no drawable area"))
        return
      }
      let format = UIGraphicsImageRendererFormat.default()
      format.scale = window.screen.scale
      var didDraw = false
      let image = UIGraphicsImageRenderer(bounds: window.bounds, format: format).image { _ in
        didDraw = window.drawHierarchy(in: window.bounds, afterScreenUpdates: true)
      }
      guard didDraw else {
        promise.reject(withError: oneNativeError(
          "E_SCREEN_CAPTURE_RENDER", "ScreenCapture.captureWindow: window could not be rendered"))
        return
      }
      guard let data = image.pngData(), let cgImage = image.cgImage else {
        promise.reject(withError: oneNativeError(
          "E_SCREEN_CAPTURE_ENCODE", "ScreenCapture.captureWindow: PNG encoding failed"))
        return
      }
      let folder = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0]
        .appendingPathComponent("OneScreenCapture", isDirectory: true)
      let destination = folder.appendingPathComponent(UUID().uuidString).appendingPathExtension("png")
      do {
        try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
        try data.write(to: destination, options: .atomic)
      } catch {
        try? FileManager.default.removeItem(at: destination)
        promise.reject(withError: oneNativeError(
          "E_SCREEN_CAPTURE_FILE", "ScreenCapture.captureWindow: PNG file could not be saved"))
        return
      }
      promise.resolve(withResult: WindowCaptureResult(
        uri: destination.absoluteString,
        width: Double(cgImage.width),
        height: Double(cgImage.height),
        size: Double(data.count)))
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
