import SwiftUI
import UIKit

@objcMembers
public final class OneNativeTabItem: NSObject, Identifiable {
  public let id: String
  public var title: String
  public var systemImage: String
  public var badge: String
  public var role: String
  public var action: Bool
  public let view: UIView
  public let onLayout: (CGRect) -> Void

  public init(id: String, title: String, systemImage: String, badge: String, role: String, action: Bool, view: UIView, onLayout: @escaping (CGRect) -> Void) {
    self.id = id
    self.title = title
    self.systemImage = systemImage
    self.badge = badge
    self.role = role
    self.action = action
    self.view = view
    self.onLayout = onLayout
  }
}

private final class TabsModel: ObservableObject {
  @Published var pages: [OneNativeTabItem] = []
  @Published var controlled = OneNativeControlled("")
  @Published var sidebarAdaptable = false
  @Published var tabBarMinimizeBehavior = ""
  @Published var tabViewRevision = 0
  var active = false
  var onSelection: ((String, Int, Int) -> Void)?
  var onAction: ((String) -> Void)?
  private var pendingAction: String?

  func select(_ id: String) {
    guard active, let page = pages.first(where: { $0.id == id }) else { return }
    if page.action {
      // an action tab is a button wearing a tab's chrome, so the press fires and the selection
      // stays put. TabView has already moved its own selection by the time this setter runs, so
      // rebuild it before publishing the action so observers only see a press after the binding
      // has snapped back to the controlled value.
      pendingAction = id
      tabViewRevision += 1
      return
    }
    guard controlled.value != id else { return }
    controlled.change(id)
    onSelection?(id, controlled.eventCount, controlled.revision)
  }

  func publishPendingAction() {
    guard let id = pendingAction else { return }
    pendingAction = nil
    onAction?(id)
  }
}

@objcMembers
public final class OneNativeTabsView: UIView {
  public var onSelection: ((String, Int, Int) -> Void)?
  public var onAction: ((String) -> Void)?
  private var model = TabsModel()
  private var controller: OneNativeHostingController<TabsContent>?

  public override init(frame: CGRect) {
    super.init(frame: frame)
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) is unavailable") }

  public func setPages(_ pages: [OneNativeTabItem]) {
    let topologyChanged = model.pages.map(\.id) != pages.map(\.id)
    // keep keyed page identities stable so swiftUI reconciles inserted and reordered tabs
    // against their content instead of reusing the page at the same array position.
    let mounted = Dictionary(uniqueKeysWithValues: model.pages.map { ($0.id, $0) })
    model.pages = pages.map { page in
      guard let current = mounted[page.id], current.view === page.view else { return page }
      current.title = page.title
      current.systemImage = page.systemImage
      current.badge = page.badge
      current.role = page.role
      current.action = page.action
      return current
    }
    if topologyChanged { model.tabViewRevision += 1 }
  }

  public func setSelection(_ selection: String, acknowledgedEvent: Int, revision: Int, sidebarAdaptable: Bool, tabBarMinimizeBehavior: String) {
    if let next = model.controlled.applying(selection, acknowledged: acknowledgedEvent, revision: revision) { model.controlled = next }
    if model.sidebarAdaptable != sidebarAdaptable { model.sidebarAdaptable = sidebarAdaptable }
    if model.tabBarMinimizeBehavior != tabBarMinimizeBehavior { model.tabBarMinimizeBehavior = tabBarMinimizeBehavior }
  }

  public override func didMoveToWindow() {
    super.didMoveToWindow()
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
      model.onAction = { [weak self] id in self?.onAction?(id) }
      controller = OneNativeHostingController(rootView: TabsContent(model: model, host: self))
    }
    controller?.attach(to: self)
    model.active = controller?.parent != nil
  }

  private func detachController() {
    model.active = false
    controller?.detach()
  }

  public func reset() {
    model.active = false
    model.onSelection = nil
    model.onAction = nil
    detachController()
    controller = nil
    model = TabsModel()
  }
}

private struct TabsContent: View {
  @ObservedObject var model: TabsModel
  weak var host: OneNativeTabsView?

  var body: some View {
    Group {
      if model.sidebarAdaptable { tabs.tabViewStyle(.sidebarAdaptable) }
      else { tabs.tabViewStyle(.tabBarOnly) }
    }
    .oneNativeTabBarMinimizeBehavior(model.tabBarMinimizeBehavior)
  }

  private var tabs: some View {
    TabView(selection: Binding(get: { model.controlled.value }, set: { model.select($0) })) {
      ForEach(model.pages) { page in
        OneNativeGenerated.tab(id: page.id, title: page.title, systemImage: page.systemImage, badge: page.badge, role: page.role) {
          OneNativeSlot(content: page.view, mode: .fill, layoutHost: host, onLayout: page.onLayout)
        }
      }
    }
    .onAppear { model.publishPendingAction() }
    .id(model.tabViewRevision)
  }
}
