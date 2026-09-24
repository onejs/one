import AuthenticationServices
import NitroModules
import React
import SafariServices
import UIKit

// in-app browser matching expo-web-browser's result shapes: plain pages in
// SFSafariViewController, auth in ASWebAuthenticationSession. all state is
// touched on the main queue only.
final class HybridOneBrowser: HybridOneBrowserSpec {
  private let delegate = HybridOneBrowserDelegate()
  private var safari: SFSafariViewController?
  private var browserPromise: Promise<BrowserResult>?
  private var authSession: ASWebAuthenticationSession?
  private var authPromise: Promise<BrowserAuthResult>?

  override init() {
    super.init()
    delegate.onSafariFinished = { [weak self] controller in
      self?.safariDidFinish(controller)
    }
  }

  private static func result(_ type: BrowserResultType) -> BrowserResult {
    return BrowserResult(type: type)
  }

  private static func authResult(_ type: BrowserAuthResultType, url: String? = nil)
    -> BrowserAuthResult
  {
    return BrowserAuthResult(type: type, url: url)
  }

  private static func presentingViewController() -> UIViewController? {
    var root = RCTKeyWindow()?.rootViewController
    while let presented = root?.presentedViewController {
      root = presented
    }
    return root
  }

  private static func presentationStyle(_ style: BrowserPresentationStyle?)
    -> UIModalPresentationStyle
  {
    switch style ?? .overfullscreen {
    case .automatic: return .automatic
    case .currentcontext: return .currentContext
    case .formsheet: return .formSheet
    case .fullscreen: return .fullScreen
    case .overcurrentcontext: return .overCurrentContext
    case .pagesheet: return .pageSheet
    case .overfullscreen: return .overFullScreen
    }
  }

  private static func color(hex value: String?) -> UIColor? {
    guard var hex = value?.trimmingCharacters(in: .whitespacesAndNewlines) else {
      return nil
    }
    if hex.hasPrefix("#") {
      hex.removeFirst()
    }
    guard hex.count == 6 || hex.count == 8 else { return nil }
    var rgba: UInt64 = 0
    guard Scanner(string: hex).scanHexInt64(&rgba) else { return nil }
    if hex.count == 6 {
      return UIColor(
        red: CGFloat((rgba >> 16) & 0xff) / 255,
        green: CGFloat((rgba >> 8) & 0xff) / 255,
        blue: CGFloat(rgba & 0xff) / 255,
        alpha: 1)
    }
    return UIColor(
      red: CGFloat((rgba >> 24) & 0xff) / 255,
      green: CGFloat((rgba >> 16) & 0xff) / 255,
      blue: CGFloat((rgba >> 8) & 0xff) / 255,
      alpha: CGFloat(rgba & 0xff) / 255)
  }

  private static func url(_ urlString: String) -> URL? {
    guard let url = URL(string: urlString), url.scheme != nil else { return nil }
    return url
  }

  // a bad url rejects the promise, like the bridge before the port, rather
  // than throwing synchronously into js.
  private static func rejected<T>(_ verb: String) -> Promise<T> {
    return Promise.rejected(withError: oneNativeError("E_BROWSER_URL", "\(verb): requires a url."))
  }

  func open(url urlString: String, options: BrowserNativeOptions) throws -> Promise<BrowserResult>
  {
    guard let url = Self.url(urlString) else { return Self.rejected("Browser.open") }
    let promise = Promise<BrowserResult>()
    DispatchQueue.main.async {
      if self.safari != nil {
        promise.resolve(withResult: Self.result(.locked))
        return
      }
      let safari = SFSafariViewController(
        url: url, configuration: SFSafariViewController.Configuration())
      safari.delegate = self.delegate
      if let barTint = Self.color(hex: options.toolbarColor) {
        safari.preferredBarTintColor = barTint
      }
      if let controlTint = Self.color(hex: options.controlsColor) {
        safari.preferredControlTintColor = controlTint
      }
      safari.modalPresentationStyle = Self.presentationStyle(options.presentationStyle)
      self.safari = safari
      self.browserPromise = promise
      Self.presentingViewController()?.present(safari, animated: true)
    }
    return promise
  }

  func dismiss() throws -> Promise<BrowserResult> {
    let promise = Promise<BrowserResult>()
    DispatchQueue.main.async {
      let safari = self.safari
      let browserPromise = self.browserPromise
      self.safari = nil
      self.browserPromise = nil
      if safari != nil {
        // programmatic dismissal skips the delegate, so the pending open
        // promise resolves here.
        Self.presentingViewController()?.dismiss(animated: true)
        browserPromise?.resolve(withResult: Self.result(.dismiss))
      }
      promise.resolve(withResult: Self.result(.dismiss))
    }
    return promise
  }

  func openAuthSession(url urlString: String, redirectUrl: String?, options: BrowserNativeOptions)
    throws -> Promise<BrowserAuthResult>
  {
    guard let url = Self.url(urlString) else { return Self.rejected("Browser.openAuthSession") }
    let scheme = redirectUrl.flatMap { $0.isEmpty ? nil : URL(string: $0)?.scheme }
    let promise = Promise<BrowserAuthResult>()
    DispatchQueue.main.async {
      if self.authSession != nil {
        promise.resolve(withResult: Self.authResult(.locked))
        return
      }
      let session = ASWebAuthenticationSession(url: url, callbackURLScheme: scheme) {
        [weak self] callbackURL, _ in
        guard let self else { return }
        let authPromise = self.authPromise
        self.authSession = nil
        self.authPromise = nil
        guard let authPromise else { return }
        if let callbackURL {
          authPromise.resolve(withResult: Self.authResult(.success, url: callbackURL.absoluteString))
        } else {
          authPromise.resolve(withResult: Self.authResult(.cancel))
        }
      }
      if options.preferEphemeralSession == true {
        session.prefersEphemeralWebBrowserSession = true
      }
      session.presentationContextProvider = self.delegate
      self.authSession = session
      self.authPromise = promise
      if !session.start() {
        self.authSession = nil
        self.authPromise = nil
        promise.reject(
          withError: oneNativeError(
            "E_BROWSER_START", "Browser.openAuthSession: the auth session could not start."))
      }
    }
    return promise
  }

  func dismissAuthSession() throws {
    DispatchQueue.main.async {
      self.authSession?.cancel()
      self.authSession = nil
      if let authPromise = self.authPromise {
        // canceling while the consent alert is up does not reliably run the
        // completion handler, so the pending auth promise settles here.
        // dismiss, not cancel: the close was programmatic.
        self.authPromise = nil
        authPromise.resolve(withResult: Self.authResult(.dismiss))
      }
    }
  }

  private func safariDidFinish(_ controller: SFSafariViewController) {
    guard safari === controller else { return }
    safari = nil
    let promise = browserPromise
    browserPromise = nil
    promise?.resolve(withResult: Self.result(.cancel))
  }
}

// the safari and auth-session delegate protocols need an NSObject, which a
// hybrid object cannot subclass.
final class HybridOneBrowserDelegate: NSObject, SFSafariViewControllerDelegate,
  ASWebAuthenticationPresentationContextProviding
{
  var onSafariFinished: ((SFSafariViewController) -> Void)?

  func safariViewControllerDidFinish(_ controller: SFSafariViewController) {
    onSafariFinished?(controller)
  }

  func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
    return RCTKeyWindow() ?? ASPresentationAnchor()
  }
}
