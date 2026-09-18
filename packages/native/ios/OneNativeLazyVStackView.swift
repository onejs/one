import SwiftUI
import UIKit

private final class LazyVStackModel: ObservableObject {
  @Published var alignment = "center"
}

private struct LazyVStackContent: View {
  @ObservedObject var model: LazyVStackModel
  @ObservedObject var children: OneNativeChildren

  // spacing is the platform default: the prop is waiting on a Double it can travel
  // as, and a lazy stack with default spacing is what SwiftUI gives omitting it.
  var body: some View {
    LazyVStack(alignment: alignment, spacing: nil) {
      ForEach(children.items) { child in child.content }
    }
  }

  // every value the TypeScript side accepts has a case here, so an unknown one cannot
  // reach the view and quietly land somewhere the props did not ask for.
  private var alignment: HorizontalAlignment {
    switch model.alignment {
    case "leading": return .leading
    case "center": return .center
    case "trailing": return .trailing
    default: preconditionFailure("invalid Swift.LazyVStack alignment: \(model.alignment)")
    }
  }
}

@objcMembers
public final class OneNativeLazyVStackView: OneNativeContainerView {
  private let model: LazyVStackModel

  public init() {
    let model = LazyVStackModel()
    self.model = model
    super.init(wrap: { children, _ in
      AnyView(LazyVStackContent(model: model, children: children))
    })
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) is unavailable") }

  public func configure(alignment: String) {
    if model.alignment != alignment { model.alignment = alignment }
  }
}
