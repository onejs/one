import NitroModules
import React
import UIKit

final class HybridOneScreenOrientation: HybridOneScreenOrientationSpec {
  private struct PendingRequest {
    let scene: UIWindowScene
    let mask: UIInterfaceOrientationMask
    let promise: Promise<ScreenOrientationValue>
  }

  private var listeners: [UUID: (ScreenOrientationValue) -> Void] = [:]
  private var pending: [UUID: PendingRequest] = [:]
  private var observation: NSKeyValueObservation?
  private weak var observedScene: UIWindowScene?
  private var lastOrientation: ScreenOrientationValue?
  private var activationObserver: NSObjectProtocol?

  override init() {
    super.init()
    activationObserver = NotificationCenter.default.addObserver(
      forName: UIScene.didActivateNotification, object: nil, queue: .main
    ) { [weak self] _ in
      self?.observeCurrentScene()
    }
  }

  deinit {
    if let activationObserver { NotificationCenter.default.removeObserver(activationObserver) }
  }

  func getOrientation() throws -> Promise<ScreenOrientationValue> {
    let promise = Promise<ScreenOrientationValue>()
    DispatchQueue.main.async {
      guard let scene = Self.currentScene() else {
        promise.reject(withError: Self.error(
          "E_SCREEN_ORIENTATION_SCENE", "ScreenOrientation.getOrientation: no active window scene"))
        return
      }
      self.observe(scene)
      promise.resolve(withResult: Self.value(scene.effectiveGeometry.interfaceOrientation))
    }
    return promise
  }

  func lock(orientation: ScreenOrientationLock) throws -> Promise<ScreenOrientationValue> {
    request(Self.mask(orientation))
  }

  func unlock() throws -> Promise<ScreenOrientationValue> {
    request(.all)
  }

  func addChangeListener(
    onChange: @escaping (ScreenOrientationValue) -> Void
  ) throws -> () -> Void {
    let id = UUID()
    DispatchQueue.main.async {
      self.listeners[id] = onChange
      self.observeCurrentScene()
    }
    return { [weak self] in
      DispatchQueue.main.async {
        self?.listeners.removeValue(forKey: id)
      }
    }
  }

  private func request(_ mask: UIInterfaceOrientationMask) -> Promise<ScreenOrientationValue> {
    let promise = Promise<ScreenOrientationValue>()
    DispatchQueue.main.async {
      guard UIApplication.shared.applicationState == .active,
        let scene = Self.currentScene() else {
        promise.reject(withError: Self.error(
          "E_SCREEN_ORIENTATION_SCENE", "ScreenOrientation: request while a window scene is active"))
        return
      }
      self.observe(scene)
      let id = UUID()
      self.pending[id] = PendingRequest(scene: scene, mask: mask, promise: promise)
      scene.requestGeometryUpdate(
        UIWindowScene.GeometryPreferences.iOS(interfaceOrientations: mask)
      ) { [weak self] error in
        DispatchQueue.main.async {
          guard let request = self?.pending.removeValue(forKey: id) else { return }
          request.promise.reject(withError: Self.error(
            "E_SCREEN_ORIENTATION_UNSUPPORTED", "ScreenOrientation: \(error.localizedDescription)"))
        }
      }
      self.deliver(scene)
      DispatchQueue.main.asyncAfter(deadline: .now() + 10) { [weak self] in
        guard let request = self?.pending.removeValue(forKey: id) else { return }
        request.promise.reject(withError: Self.error(
          "E_SCREEN_ORIENTATION_TIMEOUT", "ScreenOrientation: scene did not reach the requested orientation"))
      }
    }
    return promise
  }

  private func observeCurrentScene() {
    guard let scene = Self.currentScene() else { return }
    observe(scene)
  }

  private func observe(_ scene: UIWindowScene) {
    guard observedScene !== scene else { return }
    observation = nil
    observedScene = scene
    lastOrientation = Self.value(scene.effectiveGeometry.interfaceOrientation)
    observation = scene.observe(\.effectiveGeometry, options: [.new]) { [weak self, weak scene] _, _ in
      DispatchQueue.main.async {
        guard let scene else { return }
        self?.deliver(scene)
      }
    }
  }

  private func deliver(_ scene: UIWindowScene) {
    guard observedScene === scene else { return }
    let orientation = Self.value(scene.effectiveGeometry.interfaceOrientation)
    if orientation.stringValue != lastOrientation?.stringValue {
      lastOrientation = orientation
      for listener in listeners.values { listener(orientation) }
    }
    let mask = Self.mask(scene.effectiveGeometry.interfaceOrientation)
    for (id, request) in Array(pending) where request.scene === scene && request.mask.contains(mask) {
      pending.removeValue(forKey: id)?.promise.resolve(withResult: orientation)
    }
  }

  private static func currentScene() -> UIWindowScene? {
    RCTKeyWindow()?.windowScene
  }

  private static func value(_ orientation: UIInterfaceOrientation) -> ScreenOrientationValue {
    switch orientation {
    case .portrait: return .portrait
    case .portraitUpsideDown: return .portraitupsidedown
    case .landscapeLeft: return .landscapeleft
    case .landscapeRight: return .landscaperight
    case .unknown: return .unknown
    @unknown default: return .unknown
    }
  }

  private static func mask(_ orientation: ScreenOrientationLock) -> UIInterfaceOrientationMask {
    switch orientation {
    case .portrait: return .portrait
    case .portraitupsidedown: return .portraitUpsideDown
    case .landscapeleft: return .landscapeLeft
    case .landscaperight: return .landscapeRight
    case .landscape: return .landscape
    }
  }

  private static func mask(_ orientation: UIInterfaceOrientation) -> UIInterfaceOrientationMask {
    switch orientation {
    case .portrait: return .portrait
    case .portraitUpsideDown: return .portraitUpsideDown
    case .landscapeLeft: return .landscapeLeft
    case .landscapeRight: return .landscapeRight
    case .unknown: return []
    @unknown default: return []
    }
  }

  private static func error(_ code: String, _ message: String) -> RuntimeError {
    oneNativeError(code, message)
  }
}
