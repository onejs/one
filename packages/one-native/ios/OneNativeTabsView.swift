import SwiftUI
import UIKit

@objcMembers
public final class OneNativeTabItem: NSObject, Identifiable {
  public let id: String
  public let title: String
  public let systemImage: String
  public let badge: String
  public let role: String
  public let view: UIView
  public let onLayout: (CGRect) -> Void

  public init(id: String, title: String, systemImage: String, badge: String, role: String, view: UIView, onLayout: @escaping (CGRect) -> Void) {
    self.id = id
    self.title = title
    self.systemImage = systemImage
    self.badge = badge
    self.role = role
    self.view = view
    self.onLayout = onLayout
  }
}

private final class TabsModel: ObservableObject {
  @Published var pages: [OneNativeTabItem] = []
  @Published var selection = ""
  @Published var sidebarAdaptable = false
  @Published var tabBarMinimizeBehavior = ""
  var eventCount = 0
  var active = false
  var onSelection: ((String, Int) -> Void)?

  func select(_ id: String) {
    guard active, selection != id, pages.contains(where: { $0.id == id }) else { return }
    eventCount += 1
    selection = id
    onSelection?(id, eventCount)
  }
}

@objcMembers
public final class OneNativeTabsView: UIView {
  public var onSelection: ((String, Int) -> Void)?
  private var model = TabsModel()
  private var controller: OneNativeHostingController<TabsContent>?

  public override init(frame: CGRect) {
    super.init(frame: frame)
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) is unavailable") }

  public func setPages(_ pages: [OneNativeTabItem]) {
    model.pages = pages
  }

  public func setSelection(_ selection: String, acknowledgedEvent: Int, sidebarAdaptable: Bool, tabBarMinimizeBehavior: String) {
    if acknowledgedEvent >= model.eventCount && model.selection != selection { model.selection = selection }
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
      model.onSelection = { [weak self] id, count in self?.onSelection?(id, count) }
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
    TabView(selection: Binding(get: { model.selection }, set: { model.select($0) })) {
      ForEach(model.pages) { page in
        OneNativeGenerated.tab(id: page.id, title: page.title, systemImage: page.systemImage, badge: page.badge, role: page.role) {
          NativePageSlot(page: page, host: host)
        }
      }
    }
  }
}

private struct NativePageSlot: UIViewRepresentable {
  let page: OneNativeTabItem
  weak var host: OneNativeTabsView?

  func makeUIView(context: Context) -> SlotView {
    SlotView(page: page, host: host)
  }

  func updateUIView(_ view: SlotView, context: Context) {
    if view.page.view !== page.view {
      view.page.view.removeFromSuperview()
    }
    if page.view.superview !== view { view.addSubview(page.view) }
    view.page = page
    view.host = host
    view.setNeedsLayout()
  }

  static func dismantleUIView(_ view: SlotView, coordinator: ()) {
    if view.page.view.superview === view { view.page.view.removeFromSuperview() }
  }
}

private final class SlotView: UIView {
  var page: OneNativeTabItem
  weak var host: OneNativeTabsView?

  init(page: OneNativeTabItem, host: OneNativeTabsView?) {
    self.page = page
    self.host = host
    super.init(frame: .zero)
    addSubview(page.view)
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) is unavailable") }

  override func layoutSubviews() {
    super.layoutSubviews()
    guard let host, window != nil else { return }
    // report bounded SwiftUI allocation directly to Fabric, without a JS round trip.
    page.onLayout(convert(bounds, to: host))
    page.view.frame = bounds
  }
}
