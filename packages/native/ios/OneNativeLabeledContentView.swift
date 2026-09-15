import SwiftUI
import UIKit

private final class LabeledContentModel: ObservableObject {
  @Published var label = ""
  @Published var value = ""
  @Published var systemImage = ""
  var onHeight: ((CGFloat) -> Void)?
}

private struct LabeledContentContent: View {
  @ObservedObject var model: LabeledContentModel
  @ObservedObject var children: OneNativeChildren
  // composed, the parent lays the row out and measures it; only a standalone row
  // answers to Yoga.
  let standalone: Bool

  var body: some View {
    // standalone, the row fills the width Yoga proposed so the value takes the trailing
    // edge; composed, the enclosing stack owns alignment.
    row
      .frame(maxWidth: standalone ? .infinity : nil, alignment: .leading)
      .oneNativeMeasured(standalone, model.onHeight)
  }

  // the label names the row and the content is whatever the row carries: React Native
  // sends either a string value or composed children, and src/labeledContent.ts rejects
  // both at once, so this branch is total.
  private var row: some View {
    LabeledContent {
      if children.items.isEmpty {
        Text(model.value)
      } else {
        HStack(spacing: 0) {
          ForEach(children.items) { child in child.content }
        }
      }
    } label: {
      if model.systemImage.isEmpty {
        Text(model.label)
      } else {
        Label(model.label, systemImage: model.systemImage)
      }
    }
  }
}

@objcMembers
public final class OneNativeLabeledContentView: OneNativeContainerView {
  public var onMeasure: ((CGFloat) -> Void)?
  private let model: LabeledContentModel

  public init() {
    let model = LabeledContentModel()
    self.model = model
    super.init(wrap: { children, standalone in
      AnyView(LabeledContentContent(model: model, children: children, standalone: standalone))
    })
    model.onHeight = { [weak self] height in self?.onMeasure?(height) }
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) is unavailable") }

  public func configure(label: String, value: String, systemImage: String) {
    if model.label != label { model.label = label }
    if model.value != value { model.value = value }
    if model.systemImage != systemImage { model.systemImage = systemImage }
  }
}
