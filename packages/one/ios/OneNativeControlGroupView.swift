import SwiftUI
import UIKit

private final class ControlGroupModel: ObservableObject {
  @Published var label = ""
  @Published var systemImage = ""
  @Published var controlGroupStyle = "automatic"
  @Published var boundedHeight = false
  var onHeight: ((CGFloat) -> Void)?
}

private struct ControlGroupContent: View {
  @ObservedObject var model: ControlGroupModel
  @ObservedObject var children: OneNativeChildren
  let standalone: Bool
  @ObservedObject var bridge: OneNativeSchemeBridge

  var body: some View {
    ControlGroup {
      ForEach(children.items) { child in child.content }
    } label: {
      if !model.label.isEmpty, !model.systemImage.isEmpty {
        Label(model.label, systemImage: model.systemImage)
      } else if !model.systemImage.isEmpty {
        Image(systemName: model.systemImage)
      } else if !model.label.isEmpty {
        Text(model.label)
      }
    }
    .oneNativeControlGroupStyle(model.controlGroupStyle)
    .frame(maxWidth: standalone ? .infinity : nil, alignment: .leading)
    .oneNativeMeasured(standalone && !model.boundedHeight, model.onHeight)
    .oneNativeScheme(standalone, bridge.scheme)
  }
}

@objcMembers
public final class OneNativeControlGroupView: OneNativeContainerView {
  public var onMeasure: ((CGFloat) -> Void)?
  private let model: ControlGroupModel
  private let bridge: OneNativeSchemeBridge
  private var traitRegistration: NSObjectProtocol?

  public init() {
    let model = ControlGroupModel()
    let bridge = OneNativeSchemeBridge()
    self.model = model
    self.bridge = bridge
    super.init(wrap: { children, standalone in
      AnyView(ControlGroupContent(model: model, children: children, standalone: standalone, bridge: bridge))
    })
    model.onHeight = { [weak self] height in self?.onMeasure?(height) }
    traitRegistration = registerForTraitChanges([UITraitUserInterfaceStyle.self]) {
      [weak bridge] (view: OneNativeControlGroupView, _: UITraitCollection) in
      bridge?.sync(view.traitCollection)
    }
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) is unavailable") }

  public override func didMoveToWindow() {
    bridge.sync(traitCollection)
    super.didMoveToWindow()
  }

  public func configure(label: String, systemImage: String, controlGroupStyle: String, boundedHeight: Bool) {
    if model.label != label { model.label = label }
    if model.systemImage != systemImage { model.systemImage = systemImage }
    if model.controlGroupStyle != controlGroupStyle {
      model.controlGroupStyle = controlGroupStyle
    }
    if model.boundedHeight != boundedHeight { model.boundedHeight = boundedHeight }
  }
}
