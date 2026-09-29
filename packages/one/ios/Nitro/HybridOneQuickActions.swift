import NitroModules
import UIKit

@objc(OneQuickActionsCoordinator)
public final class OneQuickActionsCoordinator: NSObject {
  @objc public static let shared = OneQuickActionsCoordinator()

  private var initialAction: String?
  private var listeners: [UUID: (String) -> Void] = [:]

  private override init() {}

  @objc(recordInitialAction:)
  public static func recordInitialAction(_ id: String) {
    precondition(Thread.isMainThread)
    shared.initialAction = id
  }

  @objc(recordWarmAction:)
  public static func recordWarmAction(_ id: String) {
    precondition(Thread.isMainThread)
    for listener in shared.listeners.values { listener(id) }
  }

  fileprivate func addListener(_ listener: @escaping (String) -> Void) -> () -> Void {
    precondition(Thread.isMainThread)
    let token = UUID()
    listeners[token] = listener
    return { [weak self] in
      DispatchQueue.main.async { self?.listeners.removeValue(forKey: token) }
    }
  }

  fileprivate func getInitialAction() -> String? {
    precondition(Thread.isMainThread)
    return initialAction
  }

  fileprivate func clearInitialAction() {
    precondition(Thread.isMainThread)
    initialAction = nil
  }
}

final class HybridOneQuickActions: HybridOneQuickActionsSpec {
  func setItems(items: [QuickActionItem]) throws -> Promise<Void> {
    let promise = Promise<Void>()
    DispatchQueue.main.async {
      var seen = Set<String>()
      var shortcuts: [UIApplicationShortcutItem] = []
      for item in items {
        guard !item.id.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
          !item.title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
          seen.insert(item.id).inserted else {
          promise.reject(withError: oneNativeError("E_QUICK_ACTIONS_INPUT", "QuickActions.setItems: items require unique non-empty id and title"))
          return
        }
        shortcuts.append(UIApplicationShortcutItem(
          type: item.id, localizedTitle: item.title,
          localizedSubtitle: item.subtitle, icon: nil, userInfo: nil))
      }
      UIApplication.shared.shortcutItems = shortcuts
      promise.resolve(withResult: ())
    }
    return promise
  }

  func getItems() throws -> Promise<[QuickActionItem]> {
    let promise = Promise<[QuickActionItem]>()
    DispatchQueue.main.async {
      promise.resolve(withResult: (UIApplication.shared.shortcutItems ?? []).map {
        QuickActionItem(id: $0.type, title: $0.localizedTitle, subtitle: $0.localizedSubtitle)
      })
    }
    return promise
  }

  func getInitialAction() throws -> String? {
    if Thread.isMainThread { return OneQuickActionsCoordinator.shared.getInitialAction() }
    return DispatchQueue.main.sync { OneQuickActionsCoordinator.shared.getInitialAction() }
  }

  func clearInitialAction() throws {
    if Thread.isMainThread {
      OneQuickActionsCoordinator.shared.clearInitialAction()
    } else {
      DispatchQueue.main.sync { OneQuickActionsCoordinator.shared.clearInitialAction() }
    }
  }

  func addListener(listener: @escaping (String) -> Void) throws -> () -> Void {
    if Thread.isMainThread { return OneQuickActionsCoordinator.shared.addListener(listener) }
    return DispatchQueue.main.sync { OneQuickActionsCoordinator.shared.addListener(listener) }
  }
}
