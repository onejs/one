import SwiftUI
import UIKit

private final class ControlGroupModel: ObservableObject {
  @Published var label = ""
  @Published var systemImage = ""
  @Published var controlGroupStyle = "automatic"
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
    .oneNativeScheme(standalone, bridge.scheme)
  }
}

@objcMembers
public final class OneNativeControlGroupView: OneNativeContainerView {
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

  public func configure(label: String, systemImage: String, controlGroupStyle: String) {
    if model.label != label { model.label = label }
    if model.systemImage != systemImage { model.systemImage = systemImage }
    if model.controlGroupStyle != controlGroupStyle {
      model.controlGroupStyle = controlGroupStyle
    }
  }
}
