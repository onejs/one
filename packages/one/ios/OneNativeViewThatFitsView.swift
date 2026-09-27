import SwiftUI
import UIKit

private final class ViewThatFitsModel: ObservableObject {
  @Published var axes = "both"
  var onHeight: ((CGFloat) -> Void)?
}

private struct ViewThatFitsContent: View {
  @ObservedObject var model: ViewThatFitsModel
  @ObservedObject var children: OneNativeChildren
  let standalone: Bool
  @ObservedObject var bridge: OneNativeSchemeBridge

  var body: some View {
    Group {
      if #available(iOS 16.0, *) {
        ViewThatFits(in: axes) {
          ForEach(children.items) { child in child.content }
        }
      } else {
        EmptyView()
      }
    }
    .frame(maxWidth: standalone ? .infinity : nil, alignment: .leading)
    .oneNativeMeasured(standalone, model.onHeight)
    .oneNativeScheme(standalone, bridge.scheme)
  }

  private var axes: Axis.Set {
    switch model.axes {
    case "horizontal": return .horizontal
    case "vertical": return .vertical
    case "both": return [.horizontal, .vertical]
    default: preconditionFailure("invalid Swift.ViewThatFits axes: \(model.axes)")
    }
  }
}

@objcMembers
public final class OneNativeViewThatFitsView: OneNativeContainerView {
  public var onMeasure: ((CGFloat) -> Void)?
  private let model: ViewThatFitsModel
  private let bridge: OneNativeSchemeBridge
  private var traitRegistration: NSObjectProtocol?

  public init() {
    let model = ViewThatFitsModel()
    let bridge = OneNativeSchemeBridge()
    self.model = model
    self.bridge = bridge
    super.init(wrap: { children, standalone in
      AnyView(ViewThatFitsContent(model: model, children: children, standalone: standalone, bridge: bridge))
    })
    model.onHeight = { [weak self] height in self?.onMeasure?(height) }
    traitRegistration = registerForTraitChanges([UITraitUserInterfaceStyle.self]) {
      [weak bridge] (view: OneNativeViewThatFitsView, _: UITraitCollection) in
      bridge?.sync(view.traitCollection)
    }
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) is unavailable") }

  public override func didMoveToWindow() {
    bridge.sync(traitCollection)
    super.didMoveToWindow()
  }

  public func configure(axes: String) {
    if model.axes != axes { model.axes = axes }
  }
}
