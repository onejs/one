import SwiftUI
import UIKit

@objcMembers
public final class OneNativeTabItem: NSObject, Identifiable {
  public let id: String
  public let title: String
  public let systemImage: String
  public let badge: String
  public let role: String
  public let action: Bool
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
  var active = false
  var onSelection: ((String, Int, Int) -> Void)?
  var onAction: ((String) -> Void)?

  func select(_ id: String) {
    guard active, let page = pages.first(where: { $0.id == id }) else { return }
    if page.action {
      // an action tab is a button wearing a tab's chrome, so the press fires and the selection
      // stays put. TabView has already moved its own selection by the time this setter runs, so
      // republishing the unchanged value is what makes it read the binding again and snap back.
      onAction?(id)
      objectWillChange.send()
      return
    }
    guard controlled.value != id else { return }
    controlled.change(id)
    onSelection?(id, controlled.eventCount, controlled.revision)
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
    model.pages = pages
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
    // swiftUI updates the tab bar when dynamic TabContent changes, but keeps the old
    // positional content association. a topology change must rebuild TabView so its
    // controlled selection resolves against the new ordered IDs.
    .id(model.pages.map(\.id))
  }
}
