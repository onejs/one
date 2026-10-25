import UIKit
import WebKit

// the native side of a 'use dom' component: one WKWebView per mount, a
// document-start transport carrying a fresh epoch for every document, and an
// owned resource origin for built pages. src/dom holds the protocol both sides speak.
// only plain types reach One-Swift.h; objective-c++ importers may not see WebKit.
public final class OneDOMHostView: UIView {
  @objc public var onDocumentStart: ((String, Double) -> Void)?
  @objc public var onMessage: ((String) -> Void)?
  @objc public var onLoad: ((String) -> Void)?
  @objc public var onError: ((String, String, String) -> Void)?
  @objc public var onProcessTerminated: ((String) -> Void)?

  private var entryId = ""
  private var developmentURL = ""
  // the latest state React committed; each new document snapshots it.
  private var bootstrapState = ""
  private var scrollEnabled = true
  private var web: WKWebView?
  private var navigation: OneDOMNavigation?
  private var resources: OneDOMResourceHandler?
  // the one document this mount may show, without its fragment.
  private var owned: URL?
  private var epoch = ""
  // a second crash before any load finishes stays down instead of looping.
  private var recovering = false

  @objc public func configure(entryId: String, developmentURL: String, bootstrapState: String, scrollEnabled: Bool) {
    if web != nil && (entryId != self.entryId || developmentURL != self.developmentURL) {
      teardown()
    }
    self.entryId = entryId
    self.developmentURL = developmentURL
    self.bootstrapState = bootstrapState
    self.scrollEnabled = scrollEnabled
    web?.scrollView.isScrollEnabled = scrollEnabled
  }

  // fabric sets the event emitter after props, so loading waits for the
  // finished update; errors found before any navigation still reach JS.
  @objc public func mount() {
    guard web == nil, !entryId.isEmpty else { return }
    let target: URL
    if !developmentURL.isEmpty {
      guard let url = URL(string: developmentURL), url.scheme == "http" || url.scheme == "https" else {
        return fail("Invalid One DOM development URL", code: "DOM_LOAD_FAILED")
      }
      target = url
    } else {
      guard let location = OneUpdatesLauncher.currentDOMAssetLocation() else {
        return fail("One DOM assets are missing from this build", code: "DOM_ASSETS_MISSING")
      }
      let base = location.root.appendingPathComponent("one-dom", isDirectory: true)
      guard let page = OneDOMResourceHandler.page(entryId: entryId, base: base) else {
        return fail("One DOM entry \(entryId) is missing from the build manifest", code: "DOM_ASSETS_MISSING")
      }
      let handler = OneDOMResourceHandler(selection: location.selection, base: base)
      resources = handler
      target = handler.url(for: page)
    }
    owned = Self.withoutFragment(target)
    let configuration = WKWebViewConfiguration()
    if let resources {
      configuration.setURLSchemeHandler(resources, forURLScheme: OneDOMResourceHandler.scheme)
    }
    let proxy = OneDOMMessageProxy()
    proxy.host = self
    configuration.userContentController.add(proxy, name: "oneDOM")
    configuration.allowsInlineMediaPlayback = true
    let web = WKWebView(frame: bounds, configuration: configuration)
    let navigation = OneDOMNavigation()
    navigation.host = self
    self.navigation = navigation
    web.navigationDelegate = navigation
    web.uiDelegate = navigation
    web.isOpaque = false
    web.backgroundColor = .clear
    web.scrollView.backgroundColor = .clear
    web.scrollView.contentInsetAdjustmentBehavior = .never
    web.scrollView.isScrollEnabled = scrollEnabled
    web.allowsLinkPreview = false
    #if DEBUG
    web.isInspectable = true
    #endif
    addSubview(web)
    self.web = web
    web.load(URLRequest(url: target))
  }

  public override func layoutSubviews() {
    super.layoutSubviews()
    web?.frame = bounds
  }

  // commands arrive in order and go to whichever document is current; the
  // envelope's epoch lets the page drop anything meant for an earlier one.
  @objc public func post(_ message: String) {
    guard let web, !epoch.isEmpty else { return }
    web.callAsyncJavaScript(
      "globalThis.__oneDOMReceive?.(raw)", arguments: ["raw": message], in: nil, in: .page,
      completionHandler: nil)
  }

  // the page disposes while its realm is alive, then the view goes away.
  @objc public func teardown() {
    guard let retiring = web else { return }
    let epoch = self.epoch
    web = nil
    owned = nil
    self.epoch = ""
    recovering = false
    retiring.navigationDelegate = nil
    retiring.uiDelegate = nil
    navigation = nil
    resources?.close()
    resources = nil
    retiring.removeFromSuperview()
    var finished = false
    let finish = {
      guard !finished else { return }
      finished = true
      retiring.stopLoading()
      retiring.configuration.userContentController.removeAllScriptMessageHandlers()
    }
    guard !epoch.isEmpty else { return finish() }
    let dispose = "{\"version\":1,\"epoch\":" + Self.json(epoch) + ",\"type\":\"dispose\"}"
    retiring.callAsyncJavaScript(
      "globalThis.__oneDOMReceive?.(raw)", arguments: ["raw": dispose], in: nil, in: .page
    ) { _ in finish() }
    // a hung content process never answers; release the view anyway.
    DispatchQueue.main.asyncAfter(deadline: .now() + 1, execute: finish)
  }

  deinit {
    web?.configuration.userContentController.removeAllScriptMessageHandlers()
    resources?.close()
  }

  // MARK: - documents

  fileprivate func receive(_ message: WKScriptMessage) {
    guard let web, message.webView === web, message.frameInfo.isMainFrame,
      let owned, Self.sameOrigin(message.frameInfo.securityOrigin, owned),
      let body = message.body as? String
    else { return }
    onMessage?(body)
  }

  // snapshots the committed state with a fresh epoch and installs it before
  // the document's first script; onDocumentStart precedes all of its messages.
  @discardableResult
  private func beginDocument() -> Bool {
    let epoch = UUID().uuidString.lowercased()
    guard let (bootstrap, revision) = Self.bootstrap(state: bootstrapState, entryId: entryId, epoch: epoch) else {
      self.epoch = epoch
      onDocumentStart?(epoch, 0)
      onError?(epoch, "Invalid One DOM bootstrap state", "DOM_PROTOCOL")
      return false
    }
    let controller = web!.configuration.userContentController
    controller.removeAllUserScripts()
    controller.addUserScript(
      WKUserScript(
        source: Self.transport(bootstrap, development: !developmentURL.isEmpty), injectionTime: .atDocumentStart, forMainFrameOnly: true))
    self.epoch = epoch
    onDocumentStart?(epoch, revision)
    return true
  }

  private func fail(_ message: String, code: String) {
    let epoch = UUID().uuidString.lowercased()
    self.epoch = epoch
    onDocumentStart?(epoch, Self.revision(of: bootstrapState) ?? 0)
    onError?(epoch, message, code)
  }

  static func bootstrap(state: String, entryId: String, epoch: String) -> (String, Double)? {
    let trimmed = state.trimmingCharacters(in: .whitespacesAndNewlines)
    guard trimmed.hasPrefix("{"),
      let object = (try? JSONSerialization.jsonObject(with: Data(trimmed.utf8))) as? [String: Any],
      (object["version"] as? NSNumber)?.intValue == 1,
      let revision = (object["revision"] as? NSNumber)?.doubleValue,
      object["epoch"] == nil, object["entryId"] == nil, object["os"] == nil
    else { return nil }
    // splice the committed bytes rather than re-encode them, so numbers and
    // strings reach the page exactly as JS serialized them.
    let head = "{\"entryId\":" + json(entryId) + ",\"os\":\"ios\",\"epoch\":" + json(epoch) + ","
    return (head + trimmed.dropFirst(), revision)
  }

  static func revision(of state: String) -> Double? {
    let object = (try? JSONSerialization.jsonObject(with: Data(state.utf8))) as? [String: Any]
    return (object?["revision"] as? NSNumber)?.doubleValue
  }

  // the transport contract from src/dom/browserBridge.ts: bootstrap,
  // postMessage and subscribe, installed before any application script.
  static func transport(_ bootstrap: String, development: Bool) -> String {
    """
    (() => {
      const listeners = new Set()
      const handler = window.webkit.messageHandlers.oneDOM
      const bootstrap = \(bootstrap)
      const send = (raw) => handler.postMessage(raw)
      // failures before the page subscribes, such as a module that throws
      // while evaluating or an entry that fails to load, still reach native.
      const early = (error, fallback) => {
        // the same fields serializeError in src/dom/serialize.ts gives
        let failure = { name: 'Error', message: fallback }
        try {
          if (error instanceof Error) {
            failure = { name: String(error.name || 'Error'), message: String(error.message) }
            if (typeof error.code === 'string') failure.code = error.code
            if (\(development) && typeof error.stack === 'string') failure.stack = error.stack
          } else if (error === null || ['string', 'number', 'boolean', 'bigint'].includes(typeof error)) {
            failure.message = String(error)
          }
        } catch {}
        send(JSON.stringify({ version: 1, epoch: bootstrap.epoch, type: 'error', error: failure }))
      }
      const onError = (event) => {
        const target = event.target
        if (event instanceof ErrorEvent) early(event.error, event.message || 'Script error')
        else if (target instanceof HTMLScriptElement || target instanceof HTMLLinkElement)
          early(undefined, 'Failed to load ' + (target.src || target.href))
      }
      const onRejection = (event) => early(event.reason, 'Unhandled promise rejection')
      addEventListener('error', onError, true)
      addEventListener('unhandledrejection', onRejection)
      // the page's first subscriber reports from then on
      let handedOff = false
      const handoff = () => {
        if (handedOff) return
        handedOff = true
        removeEventListener('error', onError, true)
        removeEventListener('unhandledrejection', onRejection)
      }
      Object.defineProperty(globalThis, '__oneDOMReceive', {
        value: (raw) => { for (const listener of [...listeners]) listener(raw) },
      })
      Object.defineProperty(globalThis, '__oneDOM', {
        value: Object.freeze({
          bootstrap,
          postMessage(raw) {
            if (typeof raw !== 'string') throw new TypeError('One DOM messages are strings')
            send(raw)
          },
          subscribe(listener) {
            handoff()
            listeners.add(listener)
            return () => { listeners.delete(listener) }
          },
        }),
      })
    })()
    """
  }

  static func json(_ string: String) -> String {
    let data = try! JSONSerialization.data(withJSONObject: string, options: [.fragmentsAllowed])
    return String(decoding: data, as: UTF8.self)
  }

  static func withoutFragment(_ url: URL) -> URL {
    var components = URLComponents(url: url, resolvingAgainstBaseURL: false)
    components?.fragment = nil
    return components?.url ?? url
  }

  static func sameOrigin(_ origin: WKSecurityOrigin, _ url: URL) -> Bool {
    origin.protocol == url.scheme && origin.host == (url.host ?? "") && origin.port == (url.port ?? 0)
  }
}

extension OneDOMHostView {
  fileprivate func decide(
    _ webView: WKWebView, _ action: WKNavigationAction,
    decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
  ) {
    guard webView === web, let frame = action.targetFrame else { return decisionHandler(.cancel) }
    // embedded frames load what the page asks for; owned files still go
    // through the resource handler's rules.
    guard frame.isMainFrame else { return decisionHandler(.allow) }
    guard let url = action.request.url, let owned, Self.withoutFragment(url) == owned else {
      return decisionHandler(.cancel)
    }
    if action.navigationType != .reload, url.fragment != nil, let current = webView.url,
      Self.withoutFragment(current) == owned, !epoch.isEmpty
    {
      return decisionHandler(.allow)
    }
    decisionHandler(beginDocument() ? .allow : .cancel)
  }

  fileprivate func decide(
    _ webView: WKWebView, _ response: WKNavigationResponse,
    decisionHandler: @escaping (WKNavigationResponsePolicy) -> Void
  ) {
    if webView === web, response.isForMainFrame, let http = response.response as? HTTPURLResponse,
      http.statusCode >= 400
    {
      decisionHandler(.cancel)
      onError?(epoch, "One DOM page responded \(http.statusCode)", "DOM_LOAD_FAILED")
      return
    }
    decisionHandler(.allow)
  }

  fileprivate func finished(_ webView: WKWebView) {
    guard webView === web else { return }
    recovering = false
    onLoad?(epoch)
  }

  fileprivate func report(_ webView: WKWebView, _ error: Error) {
    let error = error as NSError
    // a newer navigation replaced this one, or a policy cancel already reported it.
    if webView !== web || error.code == NSURLErrorCancelled
      || (error.domain == "WebKitErrorDomain" && error.code == 102)
    {
      return
    }
    onError?(epoch, error.localizedDescription, "DOM_LOAD_FAILED")
  }

  fileprivate func terminated(_ webView: WKWebView) {
    guard webView === web, let owned else { return }
    onProcessTerminated?(epoch)
    guard !recovering else { return }
    recovering = true
    webView.load(URLRequest(url: owned))
  }
}

// webkit delegates live off the public class so they stay out of One-Swift.h.
private final class OneDOMNavigation: NSObject, WKNavigationDelegate, WKUIDelegate {
  weak var host: OneDOMHostView?

  func webView(
    _ webView: WKWebView, decidePolicyFor action: WKNavigationAction,
    decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
  ) {
    guard let host else { return decisionHandler(.cancel) }
    host.decide(webView, action, decisionHandler: decisionHandler)
  }

  func webView(
    _ webView: WKWebView, decidePolicyFor response: WKNavigationResponse,
    decisionHandler: @escaping (WKNavigationResponsePolicy) -> Void
  ) {
    guard let host else { return decisionHandler(.cancel) }
    host.decide(webView, response, decisionHandler: decisionHandler)
  }

  func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
    host?.finished(webView)
  }

  func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
    host?.report(webView, error)
  }

  func webView(
    _ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error
  ) {
    host?.report(webView, error)
  }

  func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
    host?.terminated(webView)
  }

  // target=_blank and window.open never leave the owned page.
  func webView(
    _ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration,
    for action: WKNavigationAction, windowFeatures: WKWindowFeatures
  ) -> WKWebView? {
    nil
  }
}

// the content controller retains its handlers; the host must not be one of them.
private final class OneDOMMessageProxy: NSObject, WKScriptMessageHandler {
  weak var host: OneDOMHostView?
  func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
    host?.receive(message)
  }
}
