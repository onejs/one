import SwiftUI
import UIKit

private final class LazyHStackModel: ObservableObject {
  @Published var alignment = "center"
}

private struct LazyHStackContent: View {
  @ObservedObject var model: LazyHStackModel
  @ObservedObject var children: OneNativeChildren

  // spacing is the platform default: the prop is waiting on a Double it can travel
  // as, and a lazy stack with default spacing is what SwiftUI gives omitting it.
  var body: some View {
    LazyHStack(alignment: alignment, spacing: nil) {
      ForEach(children.items) { child in child.content }
    }
  }

  // every value the TypeScript side accepts has a case here, so an unknown one cannot
  // reach the view and quietly land somewhere the props did not ask for.
  private var alignment: VerticalAlignment {
    switch model.alignment {
    case "top": return .top
    case "center": return .center
    case "bottom": return .bottom
    case "firstTextBaseline": return .firstTextBaseline
    case "lastTextBaseline": return .lastTextBaseline
    default: preconditionFailure("invalid Swift.LazyHStack alignment: \(model.alignment)")
    }
  }
}

@objcMembers
public final class OneNativeLazyHStackView: OneNativeContainerView {
  private let model: LazyHStackModel

  public init() {
    let model = LazyHStackModel()
    self.model = model
    super.init(wrap: { children, _ in
      AnyView(LazyHStackContent(model: model, children: children))
    })
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) is unavailable") }

  public func configure(alignment: String) {
    if model.alignment != alignment { model.alignment = alignment }
  }
}
