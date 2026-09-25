import NitroModules
import UIKit

// window size class and hinge state, the ios half of OneAdaptive. size
// classes come from the key window scene's trait collection with live
// trait-change registration; hinge state comes from UIHingeInteraction on
// ios 27.1+. the first listener starts the monitors and the last removal
// stops them, so the first event can never race the subscription.
final class HybridOneAdaptive: HybridOneAdaptiveSpec {
  private let lock = NSLock()
  private var sizeClassListeners: [Int: (SizeClass) -> Void] = [:]
  private var hingeListeners: [Int: (HingeState?) -> Void] = [:]
  private var nextListenerId = 0
  private var traitRegistration: (any UITraitChangeRegistration)?
  private var hingeInteraction: AnyObject?
  private var currentHinge: HingeState?
  private var isObserving = false

  @MainActor
  private func currentWindow() -> UIWindow? {
    if let window = UIApplication.shared.connectedScenes
      .compactMap({ $0 as? UIWindowScene })
      .flatMap({ $0.windows })
      .first(where: { $0.isKeyWindow }) {
      return window
    }
    return UIApplication.shared.connectedScenes
      .compactMap({ $0 as? UIWindowScene })
      .flatMap({ $0.windows })
      .first
  }

  @MainActor
  private func currentScene() -> UIWindowScene? {
    return currentWindow()?.windowScene ??
      UIApplication.shared.connectedScenes.compactMap({ $0 as? UIWindowScene }).first
  }

  private func sizeClassValue(_ sc: UIUserInterfaceSizeClass) -> UserInterfaceSizeClass {
    switch sc {
    case .compact: return .compact
    case .regular: return .regular
    default: return .unspecified
    }
  }

  @MainActor
  private func readSizeClass() -> SizeClass {
    guard let scene = currentScene() else {
      return SizeClass(horizontal: .unspecified, vertical: .unspecified)
    }
    return SizeClass(
      horizontal: sizeClassValue(scene.traitCollection.horizontalSizeClass),
      vertical: sizeClassValue(scene.traitCollection.verticalSizeClass)
    )
  }

  func getSizeClass() throws -> Promise<SizeClass> {
    return Promise.async { @MainActor [weak self] in
      guard let self = self else {
        return SizeClass(horizontal: .unspecified, vertical: .unspecified)
      }
      return self.readSizeClass()
    }
  }

  func getHinge() throws -> Promise<HingeState?> {
    let hinge: HingeState? = lock.withLock { currentHinge }
    return Promise.async { hinge }
  }

  func addSizeClassListener(listener: @escaping (_ sizeClass: SizeClass) -> Void) throws -> () -> Void {
    lock.lock()
    let id = nextListenerId
    nextListenerId += 1
    sizeClassListeners[id] = listener
    let shouldStart = !isObserving
    if shouldStart { isObserving = true }
    lock.unlock()
    if shouldStart {
      DispatchQueue.main.async { [weak self] in self?.startObservingIfNeeded() }
    }
    return { [weak self] in self?.removeSizeClassListener(id) }
  }

  func addHingeListener(listener: @escaping (_ hinge: HingeState?) -> Void) throws -> () -> Void {
    lock.lock()
    let id = nextListenerId
    nextListenerId += 1
    hingeListeners[id] = listener
    let shouldStart = !isObserving
    if shouldStart { isObserving = true }
    lock.unlock()
    if shouldStart {
      DispatchQueue.main.async { [weak self] in self?.startObservingIfNeeded() }
    }
    return { [weak self] in self?.removeHingeListener(id) }
  }

  private func removeSizeClassListener(_ id: Int) {
    lock.lock()
    sizeClassListeners[id] = nil
    let shouldStop = sizeClassListeners.isEmpty && hingeListeners.isEmpty
    if shouldStop { isObserving = false }
    lock.unlock()
    if shouldStop {
      DispatchQueue.main.async { [weak self] in self?.stopObservingIfNeeded() }
    }
  }

  private func removeHingeListener(_ id: Int) {
    lock.lock()
    hingeListeners[id] = nil
    let shouldStop = sizeClassListeners.isEmpty && hingeListeners.isEmpty
    if shouldStop { isObserving = false }
    lock.unlock()
    if shouldStop {
      DispatchQueue.main.async { [weak self] in self?.stopObservingIfNeeded() }
    }
  }

  private func emitSizeClass(_ value: SizeClass) {
    lock.lock()
    let current = Array(sizeClassListeners.values)
    lock.unlock()
    for listener in current {
      listener(value)
    }
  }

  private func emitHinge(_ value: HingeState?) {
    lock.lock()
    let current = Array(hingeListeners.values)
    lock.unlock()
    for listener in current {
      listener(value)
    }
  }

  @MainActor
  private func startObservingIfNeeded() {
    attachListenersIfNeeded()
    NotificationCenter.default.addObserver(
      self,
      selector: #selector(handleWindowSceneChange),
      name: UIWindow.didBecomeKeyNotification,
      object: nil
    )
    NotificationCenter.default.addObserver(
      self,
      selector: #selector(handleWindowSceneChange),
      name: UIScene.didActivateNotification,
      object: nil
    )
  }

  @MainActor
  @objc private func handleWindowSceneChange() {
    lock.lock()
    let observing = isObserving
    lock.unlock()
    guard observing else { return }
    attachListenersIfNeeded()
  }

  @MainActor
  private func attachListenersIfNeeded() {
    if traitRegistration == nil, let scene = currentScene() {
      traitRegistration = scene.registerForTraitChanges([UITraitHorizontalSizeClass.self, UITraitVerticalSizeClass.self]) { [weak self] (s: UIWindowScene, _) in
        guard let self = self else { return }
        let value = SizeClass(
          horizontal: self.sizeClassValue(s.traitCollection.horizontalSizeClass),
          vertical: self.sizeClassValue(s.traitCollection.verticalSizeClass)
        )
        self.emitSizeClass(value)
      }
    }
    #if ONE_IOS_27_1_SDK
    if #available(iOS 27.1, *), hingeInteraction == nil, let window = currentWindow() {
      let interaction = UIHingeInteraction { [weak self] (_, update) in
        guard let self = self else { return }
        if let hinge = update.hinge {
          let status: HingeStatus
          switch hinge.status {
          case .closed: status = .closed
          case .partiallyOpen: status = .partiallyopen
          case .fullyOpen: status = .fullyopen
          default: status = .unknown
          }
          let state = HingeState(status: status, angle: Double(hinge.angle))
          self.lock.lock()
          self.currentHinge = state
          self.lock.unlock()
          self.emitHinge(state)
        } else {
          self.lock.lock()
          self.currentHinge = nil
          self.lock.unlock()
          self.emitHinge(nil)
        }
      }
      window.addInteraction(interaction)
      hingeInteraction = interaction
    }
    #endif
  }

  @MainActor
  private func stopObservingIfNeeded() {
    NotificationCenter.default.removeObserver(self)
    if let reg = traitRegistration, let scene = currentScene() {
      scene.unregisterForTraitChanges(reg)
      traitRegistration = nil
    }
    if #available(iOS 27.1, *), let window = currentWindow(), let interaction = hingeInteraction as? UIInteraction {
      window.removeInteraction(interaction)
      hingeInteraction = nil
    }
  }
}

private extension NSLock {
  func withLock<T>(_ body: () -> T) -> T {
    lock()
    defer { unlock() }
    return body()
  }
}
