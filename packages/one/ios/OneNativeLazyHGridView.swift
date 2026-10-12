import SwiftUI
import UIKit

private final class LazyHGridModel: ObservableObject {
  @Published var rows = "[]"
  @Published var alignment = "center"
  @Published var spacing = "null"
}

private struct LazyHGridContent: View {
  @ObservedObject var model: LazyHGridModel
  @ObservedObject var children: OneNativeChildren
  let standalone: Bool
  @ObservedObject var bridge: OneNativeSchemeBridge

  var body: some View {
    LazyHGrid(
      rows: OneNativeGridValues.items(model.rows, "Swift.LazyHGrid"),
      alignment: OneNativeGridValues.vertical(model.alignment, "Swift.LazyHGrid"),
      spacing: OneNativeGridValues.optional(model.spacing, "Swift.LazyHGrid")
    ) {
      ForEach(children.items) { child in child.content }
    }
    .oneNativeScheme(standalone, bridge.scheme)
  }
}

@objcMembers
public final class OneNativeLazyHGridView: OneNativeContainerView {
  private let model: LazyHGridModel
  private let bridge: OneNativeSchemeBridge
  private var traitRegistration: NSObjectProtocol?

  public init() {
    let model = LazyHGridModel()
    let bridge = OneNativeSchemeBridge()
    self.model = model
    self.bridge = bridge
    super.init(wrap: { children, standalone in
      AnyView(LazyHGridContent(model: model, children: children, standalone: standalone, bridge: bridge))
    })
    traitRegistration = registerForTraitChanges([UITraitUserInterfaceStyle.self]) {
      [weak bridge] (view: OneNativeLazyHGridView, _: UITraitCollection) in
      bridge?.sync(view.traitCollection)
    }
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) is unavailable") }

  public override func didMoveToWindow() {
    bridge.sync(traitCollection)
    super.didMoveToWindow()
  }

  public func configure(rows: String, alignment: String, spacing: String) {
    if model.rows != rows { model.rows = rows }
    if model.alignment != alignment { model.alignment = alignment }
    if model.spacing != spacing { model.spacing = spacing }
  }
}
