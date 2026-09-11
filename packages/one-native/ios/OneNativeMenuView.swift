import SwiftUI
import UIKit

final class OneNativeMenuModel: ObservableObject {
  @Published var children: [String: [OneNativeMenuNode]] = [:]
  @Published var trigger: UIView?
  @Published var size = CGSize.zero
  @Published var label = ""
  @Published var disabled = false
  @Published var menuOrder = "automatic"
  @Published var menuActionDismissBehavior = "automatic"
  var active = false
  var items: [String: OneNativeMenuNode] = [:]
  var onAction: ((String) -> Void)?
  var onValueChange: ((String, Bool, Int) -> Void)?

  func action(_ id: String) {
    guard active, !disabled, let item = items[id], item.type == .action, !item.disabled, !item.hidden else { return }
    onAction?(id)
  }

  func changeValue(_ id: String, index: Int, value: Bool) {
    guard active, !disabled, let item = items[id], item.type == .toggle, !item.disabled, !item.hidden,
          item.values.indices.contains(index) else { return }
    onValueChange?(id, value, index)
  }
}

@objcMembers
public final class OneNativeMenuView: UIView {
  public var onAction: ((String) -> Void)?
  public var onValueChange: ((String, Bool, Int) -> Void)?
  private var model = OneNativeMenuModel()
  private var currentItems: NSArray = []
  private var controller: OneNativeHostingController<OneNativeMenuRoot>?

  public override init(frame: CGRect) { super.init(frame: frame) }
  required init?(coder: NSCoder) { fatalError("init(coder:) is unavailable") }

  public func mountTrigger(_ view: UIView) {
    precondition(model.trigger == nil, "Swift.Menu expects one RN trigger container")
    model.trigger = view
  }

  public func unmountTrigger(_ view: UIView) {
    if model.trigger === view { model.trigger = nil }
    view.removeFromSuperview()
  }

  public func configureItems(_ items: [[String: Any]], triggerLabel: String, disabled: Bool, menuOrder: String, menuActionDismissBehavior: String) {
    if model.label != triggerLabel { model.label = triggerLabel }
    if model.disabled != disabled { model.disabled = disabled }
    if model.menuOrder != menuOrder { model.menuOrder = menuOrder }
    if model.menuActionDismissBehavior != menuActionDismissBehavior { model.menuActionDismissBehavior = menuActionDismissBehavior }
    if !currentItems.isEqual(to: items) {
      currentItems = items as NSArray
      let nodes = items.map(OneNativeMenuNode.init)
      model.items = Dictionary(uniqueKeysWithValues: nodes.map { ($0.id, $0) })
      model.children = Dictionary(grouping: nodes, by: \.parentId)
    }
  }

  public override func didMoveToWindow() {
    super.didMoveToWindow()
    updateHost()
  }

  public override func layoutSubviews() {
    super.layoutSubviews()
    if model.size != bounds.size { model.size = bounds.size }
    updateHost()
  }

  private func updateHost() {
    model.active = false
    guard window != nil else { controller?.detach(); return }
    if controller == nil {
      model.onAction = { [weak self] id in self?.onAction?(id) }
      model.onValueChange = { [weak self] id, value, index in self?.onValueChange?(id, value, index) }
      controller = OneNativeHostingController(rootView: OneNativeMenuRoot(model: model))
    }
    controller?.attach(to: self)
    model.active = controller?.parent != nil
  }

  public func reset() {
    model.active = false
    model.onAction = nil
    model.onValueChange = nil
    model.trigger?.removeFromSuperview()
    controller?.detach()
    controller = nil
    currentItems = []
    model = OneNativeMenuModel()
  }
}

private struct OneNativeMenuRoot: View {
  @ObservedObject var model: OneNativeMenuModel
  var body: some View {
    if let trigger = model.trigger {
      Menu {
        OneNativeGeneratedMenuContent(model: model, parentId: "")
      } label: {
        OneNativeMenuTrigger(trigger: trigger)
          .frame(width: model.size.width, height: model.size.height)
          .contentShape(Rectangle())
      }
      .menuStyle(.button)
      .buttonStyle(.plain)
      .disabled(model.disabled)
      .accessibilityLabel(model.label)
      .oneNativeMenuOrder(model.menuOrder)
      .oneNativeMenuActionDismissBehavior(model.menuActionDismissBehavior)
    }
  }
}

private struct OneNativeMenuTrigger: UIViewRepresentable {
  let trigger: UIView
  func makeUIView(context: Context) -> TriggerSlot { TriggerSlot(trigger: trigger) }
  func updateUIView(_ view: TriggerSlot, context: Context) {
    if view.trigger !== trigger { view.trigger.removeFromSuperview(); view.trigger = trigger }
    if trigger.superview !== view { view.addSubview(trigger) }
    view.setNeedsLayout()
  }
  static func dismantleUIView(_ view: TriggerSlot, coordinator: ()) {
    if view.trigger.superview === view { view.trigger.removeFromSuperview() }
  }
}
private final class TriggerSlot: UIView {
  var trigger: UIView
  init(trigger: UIView) {
    self.trigger = trigger
    super.init(frame: .zero)
    isUserInteractionEnabled = false
    accessibilityElementsHidden = true
    addSubview(trigger)
  }
  required init?(coder: NSCoder) { fatalError("init(coder:) is unavailable") }
}
