import UIKit

@objcMembers
public final class OneNativeAdaptiveBridge: NSObject {
  public static let shared = OneNativeAdaptiveBridge()

  private var traitRegistration: (any UITraitChangeRegistration)?
  private var hingeInteraction: AnyObject?
  private var currentHingeData: [String: Any]?
  private var isObserving = false

  public var onSizeClass: ((String, String) -> Void)?
  public var onHinge: ((String, Double) -> Void)?

  @MainActor
  public func currentWindow() -> UIWindow? {
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
  public func currentScene() -> UIWindowScene? {
    return currentWindow()?.windowScene ??
      UIApplication.shared.connectedScenes.compactMap({ $0 as? UIWindowScene }).first
  }

  public func sizeClassString(_ sc: UIUserInterfaceSizeClass) -> String {
    switch sc {
    case .compact: return "compact"
    case .regular: return "regular"
    default: return "unspecified"
    }
  }

  @MainActor
  public func getSizeClass() -> [String: String] {
    guard let scene = currentScene() else {
      return ["horizontal": "unspecified", "vertical": "unspecified"]
    }
    return [
      "horizontal": sizeClassString(scene.traitCollection.horizontalSizeClass),
      "vertical": sizeClassString(scene.traitCollection.verticalSizeClass)
    ]
  }

  @MainActor
  public func getHinge() -> [String: Any]? {
    return currentHingeData
  }

  @MainActor
  public func startObserving() {
    isObserving = true
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
    guard isObserving else { return }
    attachListenersIfNeeded()
  }

  @MainActor
  private func attachListenersIfNeeded() {
    if traitRegistration == nil, let scene = currentScene() {
      traitRegistration = scene.registerForTraitChanges([UITraitHorizontalSizeClass.self, UITraitVerticalSizeClass.self]) { [weak self] (s: UIWindowScene, _) in
        guard let self = self else { return }
        let h = self.sizeClassString(s.traitCollection.horizontalSizeClass)
        let v = self.sizeClassString(s.traitCollection.verticalSizeClass)
        self.onSizeClass?(h, v)
      }
    }
    #if ONE_IOS_27_1_SDK
    if #available(iOS 27.1, *), hingeInteraction == nil, let window = currentWindow() {
      let interaction = UIHingeInteraction { [weak self] (_, update) in
        guard let self = self else { return }
        if let hinge = update.hinge {
          let statusStr: String
          switch hinge.status {
          case .closed: statusStr = "closed"
          case .partiallyOpen: statusStr = "partiallyOpen"
          case .fullyOpen: statusStr = "fullyOpen"
          default: statusStr = "unknown"
          }
          let angleVal = Double(hinge.angle)
          self.currentHingeData = ["status": statusStr, "angle": angleVal]
          self.onHinge?(statusStr, angleVal)
        } else {
          self.currentHingeData = nil
          self.onHinge?("unknown", 0.0)
        }
      }
      window.addInteraction(interaction)
      hingeInteraction = interaction
    }
    #endif
  }

  @MainActor
  public func stopObserving() {
    isObserving = false
    NotificationCenter.default.removeObserver(self)
    if let reg = traitRegistration, let scene = currentScene() {
      scene.unregisterForTraitChanges(reg)
      traitRegistration = nil
    }
    if #available(iOS 27.1, *), let window = currentWindow(), let interaction = hingeInteraction as? UIInteraction {
      window.removeInteraction(interaction)
      hingeInteraction = nil
    }
    onSizeClass = nil
    onHinge = nil
  }
}
