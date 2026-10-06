import NitroModules
import UIKit

// the app window adaptive readings follow: the active scene's key normal
// window, keeping the pinned window while an alert-level overlay becomes key.
@MainActor
private func oneAppWindow(scene pinned: UIWindowScene?, window pinnedWindow: UIWindow?) -> UIWindow? {
  let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
  let activeScene = scenes.first(where: { $0.activationState == .foregroundActive })
  let pinnedScene = pinned?.activationState == .unattached ? nil : pinned
  let scene = activeScene ?? pinnedScene ?? scenes.first
  let windows = scene?.windows ?? []
  return windows.first(where: { $0.isKeyWindow && $0.windowLevel == .normal && $0.rootViewController != nil }) ??
    windows.first(where: { $0 === pinnedWindow && !$0.isHidden }) ??
    windows.first(where: { !$0.isHidden && $0.windowLevel == .normal && $0.rootViewController != nil }) ??
    windows.first(where: { $0.isKeyWindow }) ?? windows.first
}

// the process-wide hinge reader. OneAdaptiveLaunch.mm starts it when an app
// window first becomes key, long before js imports one: a UIHingeInteraction
// reports its first state a run loop turn after it attaches, so a reader that
// attaches when js asks can only answer nil. it keeps one interaction on the
// app window, moving it across scene and key-window changes, for the life of
// the process.
@objc(OneHingeMonitor)
public final class OneHingeMonitor: NSObject {
  static let shared = OneHingeMonitor()

  private let lock = NSLock()
  private var current: HingeState?
  private var listeners: [Int: (HingeState?) -> Void] = [:]
  private var nextListenerId = 0
  private var started = false
  private var interaction: AnyObject?
  private weak var window: UIWindow?

  @MainActor
  @objc public static func start() {
    shared.startOnMain()
  }

  var value: HingeState? {
    lock.withLock { current }
  }

  // the newcomer also gets the current hinge on the next main turn, unless
  // it was removed first.
  func addListener(_ listener: @escaping (HingeState?) -> Void) -> () -> Void {
    let id: Int = lock.withLock {
      let id = nextListenerId
      nextListenerId += 1
      listeners[id] = listener
      return id
    }
    DispatchQueue.main.async { [weak self] in
      guard let self else { return }
      let (registered, value) = self.lock.withLock { (self.listeners[id], self.current) }
      registered?(value)
    }
    return { [weak self] in
      guard let self else { return }
      self.lock.withLock { self.listeners[id] = nil }
    }
  }

  @MainActor
  private func startOnMain() {
    guard !started else { return }
    started = true
    for name in [
      UIWindow.didBecomeKeyNotification,
      UIWindow.didBecomeVisibleNotification,
      UIWindow.didBecomeHiddenNotification,
      UIScene.didActivateNotification,
    ] {
      NotificationCenter.default.addObserver(self, selector: #selector(follow), name: name, object: nil)
    }
    follow()
  }

  @MainActor
  @objc private func follow() {
    #if ONE_IOS_27_1_SDK
    if #available(iOS 27.1, *) {
      let next = oneAppWindow(scene: window?.windowScene, window: window)
      guard next !== window else { return }
      window = next
      guard let next else {
        update(nil)
        return
      }
      // each window gets its own interaction and the one left behind is
      // removed, its leaving update ignored. moving one interaction instead
      // leaves stale copies on the old window (ios 27.1 duo simulator).
      let previous = interaction as? UIHingeInteraction
      let hinge = UIHingeInteraction { [weak self] source, update in
        guard let self, self.interaction === source else { return }
        self.update(update.hinge.map(Self.state))
      }
      interaction = hinge
      if let previous { previous.view?.removeInteraction(previous) }
      next.addInteraction(hinge)
    }
    #endif
  }

  #if ONE_IOS_27_1_SDK
  @available(iOS 27.1, *)
  @MainActor
  private static func state(_ hinge: UIHinge) -> HingeState {
    let status: HingeStatus
    switch hinge.status {
    case .closed: status = .closed
    case .partiallyOpen: status = .partiallyopen
    case .fullyOpen: status = .fullyopen
    default: status = .unknown
    }
    return HingeState(status: status, angle: Double(hinge.angle))
  }
  #endif

  private func update(_ value: HingeState?) {
    lock.lock()
    let unchanged: Bool
    if let previous = current, let value {
      unchanged = previous.status == value.status && previous.angle == value.angle
    } else {
      unchanged = current == nil && value == nil
    }
    if unchanged {
      lock.unlock()
      return
    }
    current = value
    let targets = Array(listeners.values)
    lock.unlock()
    for listener in targets {
      listener(value)
    }
  }
}

// window size class and hinge state, the ios half of OneAdaptive. size
// classes come from the app window scene's trait collection with live
// trait-change registration; the first listener starts that monitor and the
// last removal stops it, so the first event can never race the subscription.
// hinge state comes from OneHingeMonitor (UIHingeInteraction, ios 27.1+).
final class HybridOneAdaptive: HybridOneAdaptiveSpec {
  private let lock = NSLock()
  private var sizeClassListeners: [Int: (SizeClass) -> Void] = [:]
  private var nextListenerId = 0
  private var traitRegistration: (any UITraitChangeRegistration)?
  private weak var observedScene: UIWindowScene?
  private var notificationsRegistered = false
  private var isObserving = false

  @MainActor
  private func currentScene() -> UIWindowScene? {
    let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
    return oneAppWindow(scene: observedScene, window: nil)?.windowScene ??
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
    return OneHingeMonitor.shared.value
  }

  func getHinge() throws -> Promise<HingeState?> {
    let hinge = OneHingeMonitor.shared.value
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
    return OneHingeMonitor.shared.addListener(listener)
  }

  private func removeSizeClassListener(_ id: Int) {
    lock.lock()
    sizeClassListeners[id] = nil
    let shouldStop = sizeClassListeners.isEmpty
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

  @MainActor
  private func deliverCurrentSizeClass(to id: Int) {
    lock.lock()
    let listener = sizeClassListeners[id]
    lock.unlock()
    listener?(readSizeClass())
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
  }
}

private extension NSLock {
  func withLock<T>(_ body: () -> T) -> T {
    lock()
    defer { unlock() }
    return body()
  }
}
