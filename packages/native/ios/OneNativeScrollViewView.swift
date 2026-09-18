import SwiftUI
import UIKit

private final class ScrollViewModel: ObservableObject {
  @Published var axes = "vertical"
  @Published var showsIndicators = true
}

private struct ScrollViewContent: View {
  @ObservedObject var model: ScrollViewModel
  @ObservedObject var children: OneNativeChildren

  var body: some View {
    ScrollView(axes, showsIndicators: model.showsIndicators) {
      ForEach(children.items) { child in child.content }
    }
  }

  // every value the TypeScript side accepts has a case here, so an unknown one cannot
  // reach the view and quietly scroll the wrong way.
  private var axes: Axis.Set {
    switch model.axes {
    case "vertical": return .vertical
    case "horizontal": return .horizontal
    case "both": return [.horizontal, .vertical]
    default: preconditionFailure("invalid Swift.ScrollView axes: \(model.axes)")
    }
  }
}

@objcMembers
public final class OneNativeScrollViewView: OneNativeContainerView {
  private let model: ScrollViewModel

  public init() {
    let model = ScrollViewModel()
    self.model = model
    super.init(wrap: { children, _ in
      AnyView(ScrollViewContent(model: model, children: children))
    })
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) is unavailable") }

  public func configure(axes: String, showsIndicators: Bool) {
    if model.axes != axes { model.axes = axes }
    if model.showsIndicators != showsIndicators {
      model.showsIndicators = showsIndicators
    }
  }
}
