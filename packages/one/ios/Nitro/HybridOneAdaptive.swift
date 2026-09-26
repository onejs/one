import NitroModules
import UIKit

// window size class and hinge state, the ios half of OneAdaptive. size
// classes come from the app window scene's trait collection with live
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
  private weak var observedScene: UIWindowScene?
  private weak var observedWindow: UIWindow?
  private var notificationsRegistered = false
  private var currentHinge: HingeState?
  private var isObserving = false

  @MainActor
  private func currentWindow() -> UIWindow? {
    let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
    let activeScene = scenes.first(where: { $0.activationState == .foregroundActive })
    let pinnedScene = observedScene?.activationState == .unattached ? nil : observedScene
    let scene = activeScene ?? pinnedScene ?? scenes.first
    let windows = scene?.windows ?? []
    // keep the app window when an alert-level overlay temporarily becomes key.
    return windows.first(where: { $0.isKeyWindow && $0.windowLevel == .normal && $0.rootViewController != nil }) ??
      windows.first(where: { $0 === observedWindow && !$0.isHidden }) ??
      windows.first(where: { !$0.isHidden && $0.windowLevel == .normal && $0.rootViewController != nil }) ??
      windows.first(where: { $0.isKeyWindow }) ?? windows.first
  }

  @MainActor
  private func currentScene() -> UIWindowScene? {
    let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
    return currentWindow()?.windowScene ??
      scenes.first(where: { $0.activationState == .foregroundActive }) ?? scenes.first
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

  // synchronous seed for the JS import-time read. nitro invokes sync
  // methods off the main thread; scene traits are main-only, so hop.
  func getInitialSizeClass() throws -> SizeClass {
    if Thread.isMainThread {
      return MainActor.assumeIsolated { self.readSizeClass() }
    }
    return DispatchQueue.main.sync {
      MainActor.assumeIsolated { self.readSizeClass() }
    }
  }

  func getInitialHinge() throws -> HingeState? {
    return lock.withLock { currentHinge }
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
    } else {
      DispatchQueue.main.async { [weak self] in self?.deliverCurrentSizeClass(to: id) }
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
      DispatchQueue.main.async { [weak self] in
        self?.deliverCurrentHinge(to: id)
        self?.startObservingIfNeeded()
      }
    } else {
      DispatchQueue.main.async { [weak self] in self?.deliverCurrentHinge(to: id) }
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

  private func updateHinge(_ value: HingeState?) {
    lock.lock()
    let previous = currentHinge
    let unchanged: Bool
    if let previous, let value {
      unchanged = previous.status == value.status && previous.angle == value.angle
    } else {
      unchanged = previous == nil && value == nil
    }
    if unchanged {
      lock.unlock()
      return
    }
    currentHinge = value
    lock.unlock()
    emitHinge(value)
  }

  @MainActor
  private func deliverCurrentSizeClass(to id: Int) {
    lock.lock()
    let listener = sizeClassListeners[id]
    lock.unlock()
    listener?(readSizeClass())
  }

  @MainActor
  private func deliverCurrentHinge(to id: Int) {
    lock.lock()
    let listener = hingeListeners[id]
    let value = currentHinge
    lock.unlock()
    listener?(value)
  }

  @MainActor
  private func startObservingIfNeeded() {
    lock.lock()
    let observing = isObserving
    lock.unlock()
    guard observing else { return }
    attachListenersIfNeeded()
    guard !notificationsRegistered else { return }
    notificationsRegistered = true
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
    NotificationCenter.default.addObserver(
      self,
      selector: #selector(handleWindowSceneChange),
      name: UIWindow.didBecomeVisibleNotification,
      object: nil
    )
    NotificationCenter.default.addObserver(
      self,
      selector: #selector(handleWindowSceneChange),
      name: UIWindow.didBecomeHiddenNotification,
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
    let scene = currentScene()
    if observedScene !== scene {
      if let registration = traitRegistration, let oldScene = observedScene {
        oldScene.unregisterForTraitChanges(registration)
      }
      traitRegistration = nil
      observedScene = scene
      if let scene {
        traitRegistration = scene.registerForTraitChanges([UITraitHorizontalSizeClass.self, UITraitVerticalSizeClass.self]) { [weak self] (s: UIWindowScene, _) in
          guard let self = self else { return }
          let value = SizeClass(
            horizontal: self.sizeClassValue(s.traitCollection.horizontalSizeClass),
            vertical: self.sizeClassValue(s.traitCollection.verticalSizeClass)
          )
          self.emitSizeClass(value)
        }
      }
      emitSizeClass(readSizeClass())
    }
    #if ONE_IOS_27_1_SDK
    if #available(iOS 27.1, *) {
      let window = currentWindow()
      if observedWindow !== window {
        let oldInteraction = hingeInteraction as? UIInteraction
        hingeInteraction = nil
        if let oldWindow = observedWindow, let interaction = oldInteraction {
          oldWindow.removeInteraction(interaction)
        }
        observedWindow = window
        if let window {
          let interaction = UIHingeInteraction { [weak self] (source, update) in
            guard let self = self, self.hingeInteraction === source else { return }
            if let hinge = update.hinge {
              let status: HingeStatus
              switch hinge.status {
              case .closed: status = .closed
              case .partiallyOpen: status = .partiallyopen
              case .fullyOpen: status = .fullyopen
              default: status = .unknown
              }
              let state = HingeState(status: status, angle: Double(hinge.angle))
              self.updateHinge(state)
            } else {
              self.updateHinge(nil)
            }
          }
          hingeInteraction = interaction
          window.addInteraction(interaction)
        } else {
          updateHinge(nil)
        }
      }
    }
    #endif
  }

  @MainActor
  private func stopObservingIfNeeded() {
    lock.lock()
    let observing = isObserving
    lock.unlock()
    guard !observing else { return }
    if notificationsRegistered {
      NotificationCenter.default.removeObserver(self)
      notificationsRegistered = false
    }
    if let reg = traitRegistration, let scene = observedScene {
      scene.unregisterForTraitChanges(reg)
    }
    traitRegistration = nil
    observedScene = nil
    if #available(iOS 27.1, *), let window = observedWindow, let interaction = hingeInteraction as? UIInteraction {
      window.removeInteraction(interaction)
    }
    hingeInteraction = nil
    observedWindow = nil
    lock.lock()
    currentHinge = nil
    lock.unlock()
  }
}

private extension NSLock {
  func withLock<T>(_ body: () -> T) -> T {
    lock()
    defer { unlock() }
    return body()
  }
}
