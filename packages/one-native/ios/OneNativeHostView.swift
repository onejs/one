import SwiftUI
import UIKit

private final class HostModel: ObservableObject {
  @Published var axis = "vertical"
  @Published var spacing: Double = 0
  @Published var alignment = "leading"
  var onHeight: ((CGFloat) -> Void)?
}

private struct HostContent: View {
  @ObservedObject var model: HostModel
  @ObservedObject var children: OneNativeChildren
  // composed, the parent lays this stack out and measures it; only a standalone host
  // answers to Yoga.
  let standalone: Bool

  var body: some View {
    if standalone {
      stack
        // the host takes its ideal height whatever Yoga proposed, and reports it back.
        // measuring from SwiftUI means every content change is caught by SwiftUI's own
        // update pass; a UIKit-side measurement would need explicit scheduling.
        .fixedSize(horizontal: false, vertical: true)
        .onGeometryChange(for: CGFloat.self) { proxy in
          proxy.size.height
        } action: { height in
          model.onHeight?(height)
        }
    } else {
      stack
    }
  }

  @ViewBuilder private var stack: some View {
    if model.axis == "horizontal" {
      HStack(alignment: vertical, spacing: model.spacing) {
        ForEach(children.items) { child in child.content }
      }
    } else {
      VStack(alignment: horizontal, spacing: model.spacing) {
        ForEach(children.items) { child in child.content }
      }
      .frame(maxWidth: .infinity, alignment: alignment)
    }
  }

  // alignment names the cross axis, so it reads as leading/trailing down a column and
  // as top/bottom across a row.
  private var horizontal: HorizontalAlignment {
    switch model.alignment {
    case "center": return .center
    case "trailing": return .trailing
    default: return .leading
    }
  }

  private var vertical: VerticalAlignment {
    switch model.alignment {
    case "center": return .center
    case "trailing": return .bottom
    default: return .top
    }
  }

  private var alignment: Alignment {
    switch model.alignment {
    case "center": return .center
    case "trailing": return .trailing
    default: return .leading
    }
  }
}

@objcMembers
public final class OneNativeHostView: OneNativeContainerView {
  public var onMeasure: ((CGFloat) -> Void)?
  private let model: HostModel

  public init() {
    let model = HostModel()
    self.model = model
    super.init(wrap: { children, standalone in
      AnyView(HostContent(model: model, children: children, standalone: standalone))
    })
    model.onHeight = { [weak self] height in self?.onMeasure?(height) }
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) is unavailable") }

  public func configure(axis: String, spacing: Double, alignment: String) {
    if model.axis != axis { model.axis = axis }
    if model.spacing != spacing { model.spacing = spacing }
    if model.alignment != alignment { model.alignment = alignment }
  }
}
