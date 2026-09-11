import SwiftUI
import UIKit

private final class HostModel: ObservableObject {
  @Published var children: [OneNativeComposedChild] = []
  @Published var axis = "vertical"
  @Published var spacing: Double = 0
  @Published var alignment = "leading"
  var onHeight: ((CGFloat) -> Void)?
}

private struct HostContent: View {
  @ObservedObject var model: HostModel

  var body: some View {
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
  }

  @ViewBuilder private var stack: some View {
    if model.axis == "horizontal" {
      HStack(alignment: vertical, spacing: model.spacing) {
        ForEach(model.children) { child in child.content }
      }
    } else {
      VStack(alignment: horizontal, spacing: model.spacing) {
        ForEach(model.children) { child in child.content }
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
public final class OneNativeHostView: UIView, OneNativeCompositionParent {
  public var onMeasure: ((CGFloat) -> Void)?
  private let model = HostModel()
  private var controller: OneNativeHostingController<HostContent>?
  private var children: [UIView] = []

  public override init(frame: CGRect) {
    super.init(frame: frame)
    model.onHeight = { [weak self] height in self?.onMeasure?(height) }
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) is unavailable") }

  public func insertChild(_ child: UIView, at index: Int) {
    children.insert(child, at: min(index, children.count))
    (child as? OneNativeComposable)?.composeInto(self)
    publish()
  }

  public func removeChild(_ child: UIView) {
    guard let index = children.firstIndex(where: { $0 === child }) else { return }
    children.remove(at: index)
    (child as? OneNativeComposable)?.decompose()
    publish()
  }

  public func configure(axis: String, spacing: Double, alignment: String) {
    if model.axis != axis { model.axis = axis }
    if model.spacing != spacing { model.spacing = spacing }
    if model.alignment != alignment { model.alignment = alignment }
  }

  private func publish() {
    model.children = children.compactMap { view in
      guard let composable = view as? OneNativeComposable else { return nil }
      return OneNativeComposedChild(
        id: ObjectIdentifier(view), content: composable.compositionContent())
    }
  }

  public override func didMoveToWindow() { super.didMoveToWindow(); updateHost() }
  public override func layoutSubviews() { super.layoutSubviews(); updateHost() }

  private func updateHost() {
    guard window != nil else { controller?.detach(); return }
    if controller == nil {
      controller = OneNativeHostingController(rootView: HostContent(model: model))
    }
    controller?.attach(to: self)
  }

  public func reset() {
    for child in children { (child as? OneNativeComposable)?.decompose() }
    children.removeAll()
    model.children = []
    controller?.detach()
    controller = nil
  }
}
