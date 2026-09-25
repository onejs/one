import SwiftUI
import UIKit

private final class PagerModel: ObservableObject {
  @Published var pages: [OneNativeTabItem] = []
  @Published var controlled = OneNativeControlled("")
  @Published var pagerRevision = 0
  var active = false
  var onSelection: ((String, Int, Int) -> Void)?

  func select(_ id: String) {
    guard active, controlled.value != id,
      pages.contains(where: { $0.id == id })
    else { return }
    controlled.change(id)
    onSelection?(id, controlled.eventCount, controlled.revision)
  }
}

@objcMembers
public final class OneNativePagerView: UIView {
  public var onSelection: ((String, Int, Int) -> Void)?
  private var model = PagerModel()
  private let bridge = OneNativeSchemeBridge()
  private var traitRegistration: NSObjectProtocol?
  private var controller: OneNativeHostingController<PagerContent>?

  public override init(frame: CGRect) {
    super.init(frame: frame)
    traitRegistration = registerForTraitChanges([UITraitUserInterfaceStyle.self]) {
      [weak bridge] (view: OneNativePagerView, _: UITraitCollection) in
      bridge?.sync(view.traitCollection)
    }
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) is unavailable") }

  public func setPages(_ pages: [OneNativeTabItem]) {
    let topologyChanged = model.pages.map(\.id) != pages.map(\.id)
    // keep keyed page identities stable so swiftUI reconciles inserted and reordered
    // pages against their content instead of reusing the page at the same position.
    let mounted = Dictionary(uniqueKeysWithValues: model.pages.map { ($0.id, $0) })
    model.pages = pages.map { page in
      guard let current = mounted[page.id], current.view === page.view else { return page }
      return current
    }
    if topologyChanged { model.pagerRevision += 1 }
  }

  public func setSelection(_ selection: String, acknowledgedEvent: Int, revision: Int) {
    if let next = model.controlled.applying(selection, acknowledged: acknowledgedEvent, revision: revision) { model.controlled = next }
  }

  public override func didMoveToWindow() {
    super.didMoveToWindow()
    bridge.sync(traitCollection)
    if window == nil { detachController() }
    else { attachController() }
  }

  public override func layoutSubviews() {
    super.layoutSubviews()
    attachController()
    controller?.view.frame = bounds
  }

  private func attachController() {
    guard window != nil else { return }
    if controller == nil {
      model.onSelection = { [weak self] id, count, revision in self?.onSelection?(id, count, revision) }
      controller = OneNativeHostingController(rootView: PagerContent(model: model, host: self, bridge: bridge))
    }
    controller?.attach(to: self)
    model.active = controller?.isAttached == true
  }

  private func detachController() {
    model.active = false
    controller?.detach()
  }

  public func reset() {
    model.active = false
    model.onSelection = nil
    detachController()
    controller = nil
    model = PagerModel()
  }
}

private struct PagerContent: View {
  @ObservedObject var model: PagerModel
  weak var host: OneNativePagerView?
  @ObservedObject var bridge: OneNativeSchemeBridge

  // tag-based pages and the page style are both old API, so a pager needs none of
  // the Tab builder availability splits a tab bar carries. a pager always owns its
  // hosting controller, so the scheme applies unconditionally.
  var body: some View {
    TabView(selection: Binding(get: { model.controlled.value }, set: { model.select($0) })) {
      ForEach(model.pages) { page in
        OneNativeSlot(content: page.view, mode: .fill, layoutHost: host, onLayout: page.onLayout)
          .tag(page.id)
      }
    }
    .tabViewStyle(.page)
    .id(model.pagerRevision)
    .environment(\.colorScheme, bridge.scheme)
  }
}
