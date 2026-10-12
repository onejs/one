import SwiftUI
import UIKit

private final class GroupBoxModel: ObservableObject {
  @Published var label = ""
  var onHeight: ((CGFloat) -> Void)?
}

private struct GroupBoxContent: View {
  @ObservedObject var model: GroupBoxModel
  @ObservedObject var children: OneNativeChildren
  let standalone: Bool
  @ObservedObject var bridge: OneNativeSchemeBridge

  var body: some View {
    Group {
      if model.label.isEmpty {
        GroupBox {
          ForEach(children.items) { child in child.content }
        }
      } else {
        GroupBox {
          ForEach(children.items) { child in child.content }
        } label: {
          Text(model.label)
        }
      }
    }
    .frame(maxWidth: standalone ? .infinity : nil, alignment: .leading)
    .oneNativeMeasured(standalone, model.onHeight)
    .oneNativeScheme(standalone, bridge.scheme)
  }
}

@objcMembers
public final class OneNativeGroupBoxView: OneNativeContainerView {
  public var onMeasure: ((CGFloat) -> Void)?
  private let model: GroupBoxModel
  private let bridge: OneNativeSchemeBridge
  private var traitRegistration: NSObjectProtocol?

  public init() {
    let model = GroupBoxModel()
    let bridge = OneNativeSchemeBridge()
    self.model = model
    self.bridge = bridge
    super.init(wrap: { children, standalone in
      AnyView(GroupBoxContent(model: model, children: children, standalone: standalone, bridge: bridge))
    })
    model.onHeight = { [weak self] height in self?.onMeasure?(height) }
    traitRegistration = registerForTraitChanges([UITraitUserInterfaceStyle.self]) {
      [weak bridge] (view: OneNativeGroupBoxView, _: UITraitCollection) in
      bridge?.sync(view.traitCollection)
    }
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) is unavailable") }

  public override func didMoveToWindow() {
    bridge.sync(traitCollection)
    super.didMoveToWindow()
  }

  public func configure(label: String) {
    if model.label != label { model.label = label }
  }
}
