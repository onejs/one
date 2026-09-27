import SwiftUI
import UIKit

private final class GlassEffectContainerModel: ObservableObject {
  @Published var spacing: CGFloat? = nil
  var onHeight: ((CGFloat) -> Void)?
}

private struct GlassEffectContainerContent: View {
  @ObservedObject var model: GlassEffectContainerModel
  @ObservedObject var children: OneNativeChildren
  let standalone: Bool
  @ObservedObject var bridge: OneNativeSchemeBridge

  var body: some View {
    Group {
      if #available(iOS 26.0, *) {
        GlassEffectContainer(spacing: model.spacing) {
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
}

@objcMembers
public final class OneNativeGlassEffectContainerView: OneNativeContainerView {
  public var onMeasure: ((CGFloat) -> Void)?
  private let model: GlassEffectContainerModel
  private let bridge: OneNativeSchemeBridge
  private var traitRegistration: NSObjectProtocol?

  public init() {
    let model = GlassEffectContainerModel()
    let bridge = OneNativeSchemeBridge()
    self.model = model
    self.bridge = bridge
    super.init(wrap: { children, standalone in
      AnyView(GlassEffectContainerContent(model: model, children: children, standalone: standalone, bridge: bridge))
    })
    model.onHeight = { [weak self] height in self?.onMeasure?(height) }
    traitRegistration = registerForTraitChanges([UITraitUserInterfaceStyle.self]) {
      [weak bridge] (view: OneNativeGlassEffectContainerView, _: UITraitCollection) in
      bridge?.sync(view.traitCollection)
    }
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) is unavailable") }

  public override func didMoveToWindow() {
    bridge.sync(traitCollection)
    super.didMoveToWindow()
  }

  public func configure(spacing: Double, hasSpacing: Bool) {
    let next: CGFloat? = hasSpacing ? CGFloat(spacing) : nil
    if model.spacing != next { model.spacing = next }
  }
}
