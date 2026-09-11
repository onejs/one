import SwiftUI
import UIKit

@objcMembers
public final class OneNativeTabItem: NSObject, Identifiable {
  public let id: String
  public let title: String
  public let systemImage: String
  public let badge: String
  public let view: UIView
  public let onLayout: (CGRect) -> Void

  public init(id: String, title: String, systemImage: String, badge: String, view: UIView, onLayout: @escaping (CGRect) -> Void) {
    self.id = id
    self.title = title
    self.systemImage = systemImage
    self.badge = badge
    self.view = view
    self.onLayout = onLayout
  }
}

private final class TabsModel: ObservableObject {
  @Published var pages: [OneNativeTabItem] = []
  @Published var selection = ""
  @Published var sidebarAdaptable = false
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
  private var controller: UIHostingController<TabsContent>?

  public override init(frame: CGRect) {
    super.init(frame: frame)
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) is unavailable") }

  public func setPages(_ pages: [OneNativeTabItem]) {
    model.pages = pages
  }

  public func setSelection(_ selection: String, acknowledgedEvent: Int, sidebarAdaptable: Bool) {
    if acknowledgedEvent >= model.eventCount && model.selection != selection { model.selection = selection }
    if model.sidebarAdaptable != sidebarAdaptable { model.sidebarAdaptable = sidebarAdaptable }
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
    var responder: UIResponder? = next
    while responder != nil && !(responder is UIViewController) { responder = responder?.next }
    guard let parent = responder as? UIViewController else { return }
    if controller?.parent === parent { return }
    detachController()
    model.onSelection = { [weak self] id, count in self?.onSelection?(id, count) }
    let controller = self.controller ?? UIHostingController(rootView: TabsContent(model: model, host: self))
    self.controller = controller
    model.active = true
    parent.addChild(controller)
    controller.view.backgroundColor = .clear
    controller.view.frame = bounds
    controller.view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    addSubview(controller.view)
    controller.didMove(toParent: parent)
  }

  private func detachController() {
    model.active = false
    guard let controller, controller.parent != nil else { return }
    controller.willMove(toParent: nil)
    controller.view.removeFromSuperview()
    controller.removeFromParent()
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
    if model.sidebarAdaptable {
      tabs.tabViewStyle(.sidebarAdaptable)
    } else {
      tabs.tabViewStyle(.tabBarOnly)
    }
  }

  private var tabs: some View {
    TabView(selection: Binding(get: { model.selection }, set: { model.select($0) })) {
      ForEach(model.pages) { page in
        Tab(value: page.id) {
          NativePageSlot(page: page, host: host)
        } label: {
          if page.systemImage.isEmpty { Text(page.title) }
          else { Label(page.title, systemImage: page.systemImage) }
        }
        .badge(page.badge.isEmpty ? nil : Text(page.badge))
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
