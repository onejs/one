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
  }
}

@objcMembers
public final class OneNativeControlGroupView: OneNativeContainerView {
  private let model: ControlGroupModel

  public init() {
    let model = ControlGroupModel()
    self.model = model
    super.init(wrap: { children, _ in
      AnyView(ControlGroupContent(model: model, children: children))
    })
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) is unavailable") }

  public func configure(label: String, systemImage: String, controlGroupStyle: String) {
    if model.label != label { model.label = label }
    if model.systemImage != systemImage { model.systemImage = systemImage }
    if model.controlGroupStyle != controlGroupStyle {
      model.controlGroupStyle = controlGroupStyle
    }
  }
}
