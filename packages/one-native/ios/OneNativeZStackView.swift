import SwiftUI
import UIKit

private final class ZStackModel: ObservableObject {
  @Published var alignment = "center"
  var onHeight: ((CGFloat) -> Void)?
}

private struct ZStackContent: View {
  @ObservedObject var model: ZStackModel
  @ObservedObject var children: OneNativeChildren
  // composed, the parent lays this stack out and measures it; only a standalone stack
  // answers to Yoga.
  let standalone: Bool

  var body: some View {
    ZStack(alignment: alignment) {
      ForEach(children.items) { child in child.content }
    }
    // a stack reports its own ideal height, so it takes the width it is offered and places
    // what it holds against the alignment rather than shrinking to its widest child.
    .frame(maxWidth: .infinity, alignment: alignment)
    .oneNativeMeasured(standalone, model.onHeight)
  }

  // every value the TypeScript side accepts has a case here, so an unknown one cannot
  // reach the view and quietly land somewhere the props did not ask for.
  private var alignment: Alignment {
    switch model.alignment {
    case "topLeading": return .topLeading
    case "top": return .top
    case "topTrailing": return .topTrailing
    case "leading": return .leading
    case "center": return .center
    case "trailing": return .trailing
    case "bottomLeading": return .bottomLeading
    case "bottom": return .bottom
    case "bottomTrailing": return .bottomTrailing
    default: preconditionFailure("invalid Swift.ZStack alignment: \(model.alignment)")
    }
  }
}

@objcMembers
public final class OneNativeZStackView: OneNativeContainerView {
  public var onMeasure: ((CGFloat) -> Void)?
  private let model: ZStackModel

  public init() {
    let model = ZStackModel()
    self.model = model
    super.init(wrap: { children, standalone in
      AnyView(ZStackContent(model: model, children: children, standalone: standalone))
    })
    model.onHeight = { [weak self] height in self?.onMeasure?(height) }
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) is unavailable") }

  public func configure(alignment: String) {
    if model.alignment != alignment { model.alignment = alignment }
  }
}
