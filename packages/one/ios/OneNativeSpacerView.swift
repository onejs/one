import SwiftUI
import UIKit

private final class SpacerModel: ObservableObject {
  @Published var minLength: Double = 0
}

private struct SpacerContent: View {
  @ObservedObject var model: SpacerModel
  @ObservedObject var style: OneNativeContainerStyle

  var body: some View {
    Spacer(minLength: model.minLength)
      .oneNativeContainerStyle(style)
  }
}

@objcMembers
public final class OneNativeSpacerView: OneNativeStyledLeafView {
  private let model: SpacerModel

  public init() {
    let model = SpacerModel()
    self.model = model
    super.init(styled: { style in AnyView(SpacerContent(model: model, style: style)) })
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) is unavailable") }

  public func configure(minLength: Double) {
    if model.minLength != minLength { model.minLength = minLength }
  }

  public override func reset() {
    model.minLength = 0
    super.reset()
  }
}
