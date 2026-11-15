import SwiftUI
import UIKit

final class OneNativeHostingController<Content: View>: UIHostingController<Content> {
  var isAttached: Bool { view.superview != nil }

  // a host that fills its screen is that screen's content, as a hosting controller pushed
  // on a navigation controller is. swiftui writes navigationTitle, toolbar, searchable and
  // the content scroll view onto this controller, which is a child the bar never reads, so
  // they are carried to the screen controller the host sits in.
  var forwardsScreenNavigation = false {
    didSet { if forwardsScreenNavigation != oldValue { updateScreenNavigation() } }
  }
  private var navigationForwarder: OneNativeNavigationItemForwarder?

  // react native placed the host's box, so by default the hosted view ignores the insets
  // it would inherit from the screen. uikit computes them from where the box sits when it
  // lays out, and a transform moving the box never lays it out again: a control that
  // mounts under the status bar (a toast entering from off screen) keeps its content
  // inset out of the box. screen chrome that sits against those edges (a navigation
  // stack's bar, a tab bar, a sheet) passes screenInsets to keep them.
  init(rootView: Content, screenInsets: Bool = false) {
    super.init(rootView: rootView)
    if !screenInsets { safeAreaRegions = [] }
  }

  @available(*, unavailable)
  required init?(coder: NSCoder) { fatalError("init(coder:) is not supported") }

  // the parent is the view controller whose view is the nearest ancestor of the host,
  // the first view controller on the responder chain: uikit resolves that same
  // controller when the hosted view is added and raises
  // UIViewControllerHierarchyInconsistency for any other parent, so the parent is
  // never redirected. two controllers cannot take the child at all, because their
  // children are their content: a UITabBarController's children are its tabs, and
  // react-native-screens casts every one of them to a tab screen; a
  // UINavigationController's children are its stack, so addChild pushes the host
  // as a new screen with an empty bar and a back button. a host inside either
  // controller's own chrome (a bottom accessory, a navigation bar item) is hosted
  // without containment, as a plain subview.
  func attach(to host: UIView) {
    guard host.window != nil else { detach(); return }
    var responder: UIResponder? = host.next
    while responder != nil && !(responder is UIViewController) { responder = responder?.next }
    let nearest = responder as? UIViewController
    let parent: UIViewController? =
      (nearest == nil || nearest is UITabBarController || nearest is UINavigationController)
      ? nil : nearest
    if view.superview !== host || self.parent !== parent {
      detach()
      parent?.addChild(self)
      view.backgroundColor = .clear
      view.frame = host.bounds
      view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
      host.addSubview(view)
      if parent != nil { didMove(toParent: parent) }
      updateScreenNavigation()
    }
    view.frame = host.bounds
  }

  func detach() {
    guard isAttached || parent != nil else { return }
    navigationForwarder = nil
    for edge in [NSDirectionalRectEdge.top, .bottom] {
      if let parent, let scroll = contentScrollView(for: edge), parent.contentScrollView(for: edge) === scroll {
        parent.setContentScrollView(nil, for: edge)
      }
    }
    if parent != nil { willMove(toParent: nil) }
    view.removeFromSuperview()
    if parent != nil { removeFromParent() }
  }

  override func setContentScrollView(_ scrollView: UIScrollView?, for edge: NSDirectionalRectEdge) {
    super.setContentScrollView(scrollView, for: edge)
    if forwardsScreenNavigation { parent?.setContentScrollView(scrollView, for: edge) }
  }

  private func updateScreenNavigation() {
    guard forwardsScreenNavigation, let parent else { navigationForwarder = nil; return }
    if navigationForwarder?.target !== parent.navigationItem {
      navigationForwarder = OneNativeNavigationItemForwarder(source: navigationItem, target: parent.navigationItem)
    }
    for edge in [NSDirectionalRectEdge.top, .bottom] {
      if let scroll = contentScrollView(for: edge) { parent.setContentScrollView(scroll, for: edge) }
    }
  }
}

// mirrors the fields swiftui set on a hosting controller's item onto its screen's item.
// the screen's owner (react-native-screens) rewrites its whole item whenever the screen's
// options change or it reappears, so a field the view declared is put back as soon as
// anything else writes it: the view's own modifiers own those fields, as they do for a
// pushed hosting controller. fields the view never set stay with the screen's options.
final class OneNativeNavigationItemForwarder: NSObject {
  private static let keys: [String] = {
    var keys = [
      "title", "titleView", "prompt", "largeTitleDisplayMode", "style", "hidesBackButton",
      "backButtonTitle", "backButtonDisplayMode", "backBarButtonItem", "backAction",
      "leftItemsSupplementBackButton", "leftBarButtonItems", "rightBarButtonItems",
      "leadingItemGroups", "centerItemGroups", "trailingItemGroups", "pinnedTrailingGroup",
      "customizationIdentifier", "additionalOverflowItems", "titleMenuProvider", "renameDelegate",
      "documentProperties", "searchController", "hidesSearchBarWhenScrolling",
      "preferredSearchBarPlacement", "standardAppearance", "compactAppearance",
      "scrollEdgeAppearance", "compactScrollEdgeAppearance",
    ]
    if #available(iOS 26.0, *) {
      keys += [
        "attributedTitle", "subtitle", "attributedSubtitle", "subtitleView", "largeTitle",
        "largeSubtitle", "largeAttributedSubtitle", "largeSubtitleView",
        "searchBarPlacementAllowsToolbarIntegration", "searchBarPlacementAllowsExternalIntegration",
      ]
    }
    return keys
  }()

  private let source: UINavigationItem
  let target: UINavigationItem
  // the fields the view has written; a field it later resets to the default stays owned,
  // so the reset reaches the screen too.
  private var owned = Set<String>()
  private var applying = false

  init(source: UINavigationItem, target: UINavigationItem) {
    self.source = source
    self.target = target
    super.init()
    let defaults = UINavigationItem()
    for key in Self.keys {
      let value = source.value(forKey: key) as AnyObject?
      let initial = defaults.value(forKey: key) as AnyObject?
      if !Self.same(value, initial) { owned.insert(key) }
      source.addObserver(self, forKeyPath: key, context: nil)
      target.addObserver(self, forKeyPath: key, context: nil)
    }
    for key in owned { apply(key) }
  }

  deinit {
    for key in Self.keys {
      source.removeObserver(self, forKeyPath: key)
      target.removeObserver(self, forKeyPath: key)
    }
  }

  private static func same(_ a: AnyObject?, _ b: AnyObject?) -> Bool {
    switch (a, b) {
    case (nil, nil): return true
    case let (a?, b?): return a === b || a.isEqual(b)
    case let (a?, nil), let (nil, a?): return (a as? NSArray)?.count == 0
    }
  }

  private func apply(_ key: String) {
    let value = source.value(forKey: key) as AnyObject?
    guard !applying, !Self.same(target.value(forKey: key) as AnyObject?, value) else { return }
    applying = true
    target.setValue(value, forKey: key)
    applying = false
  }

  override func observeValue(
    forKeyPath keyPath: String?, of object: Any?, change: [NSKeyValueChangeKey: Any]?,
    context: UnsafeMutableRawPointer?
  ) {
    guard let keyPath else { return }
    if (object as AnyObject?) === source { owned.insert(keyPath) }
    if owned.contains(keyPath) { apply(keyPath) }
  }
}
