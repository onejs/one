import UIKit

@main
final class AppDelegate: UIResponder, UIApplicationDelegate {
  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    true
  }

  func application(
    _ application: UIApplication,
    configurationForConnecting connectingSceneSession: UISceneSession,
    options: UIScene.ConnectionOptions
  ) -> UISceneConfiguration {
    let config = UISceneConfiguration(name: "Default", sessionRole: connectingSceneSession.role)
    config.delegateClass = SceneDelegate.self
    return config
  }
}

final class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options: UIScene.ConnectionOptions) {
    guard let windowScene = scene as? UIWindowScene else { return }
    let window = UIWindow(windowScene: windowScene)
    window.rootViewController = HarnessRootViewController()
    window.makeKeyAndVisible()
    self.window = window
  }
}

/// A single screen with buttons that: (a) reset the harness's app-group
/// control flags, and (b) present the system share sheet with sample
/// text+URL content so `HarnessShareExtension` shows up as a target -- this
/// is the only way to reach a Share extension's real UI, since nothing can
/// launch it directly.
final class HarnessRootViewController: UIViewController {
  override func viewDidLoad() {
    super.viewDidLoad()
    view.backgroundColor = .systemBackground

    let shareButton = makeButton(title: "Share (success path)", action: #selector(shareSuccessPath))
    let shareFailButton = makeButton(title: "Share (send fails)", action: #selector(shareSendFailsPath))
    let shareNoDestinationsButton = makeButton(title: "Share (destinations fail)", action: #selector(shareDestinationsFailPath))

    let stack = UIStackView(arrangedSubviews: [shareButton, shareFailButton, shareNoDestinationsButton])
    stack.axis = .vertical
    stack.spacing = 16
    stack.translatesAutoresizingMaskIntoConstraints = false
    view.addSubview(stack)
    NSLayoutConstraint.activate([
      stack.centerXAnchor.constraint(equalTo: view.safeAreaLayoutGuide.centerXAnchor),
      stack.centerYAnchor.constraint(equalTo: view.safeAreaLayoutGuide.centerYAnchor),
    ])
  }

  private func makeButton(title: String, action: Selector) -> UIButton {
    let button = UIButton(type: .system)
    button.setTitle(title, for: .normal)
    button.addTarget(self, action: action, for: .touchUpInside)
    return button
  }

  @objc private func shareSuccessPath() {
    setFlags(sendFail: false, destinationsFail: false)
    presentShareSheet()
  }

  @objc private func shareSendFailsPath() {
    setFlags(sendFail: true, destinationsFail: false)
    presentShareSheet()
  }

  @objc private func shareDestinationsFailPath() {
    setFlags(sendFail: false, destinationsFail: true)
    presentShareSheet()
  }

  private func setFlags(sendFail: Bool, destinationsFail: Bool) {
    let defaults = UserDefaults(suiteName: harnessAppGroupIdentifier)
    defaults?.set(sendFail, forKey: "sendShouldFail")
    defaults?.set(destinationsFail, forKey: "destinationsShouldFail")
  }

  private func presentShareSheet() {
    let url = URL(string: "https://example.com/one-share-target")!
    let activity = UIActivityViewController(activityItems: ["Check out One's share target", url], applicationActivities: nil)
    present(activity, animated: true)
  }
}
