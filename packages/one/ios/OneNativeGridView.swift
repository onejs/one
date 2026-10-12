import SwiftUI
import UIKit

private final class GridModel: ObservableObject {
  @Published var alignment = "center"
  @Published var horizontalSpacing = "null"
  @Published var verticalSpacing = "null"
}

private struct GridContent: View {
  @ObservedObject var model: GridModel
  @ObservedObject var children: OneNativeChildren
  let standalone: Bool
  @ObservedObject var bridge: OneNativeSchemeBridge

  var body: some View {
    // a Grid child that is not a GridRow spans every column, as in SwiftUI.
    Grid(
      alignment: OneNativeGridValues.alignment(model.alignment, "Swift.Grid"),
      horizontalSpacing: OneNativeGridValues.optional(model.horizontalSpacing, "Swift.Grid horizontal"),
      verticalSpacing: OneNativeGridValues.optional(model.verticalSpacing, "Swift.Grid vertical")
    ) {
      ForEach(children.items) { child in child.content }
    }
    .oneNativeScheme(standalone, bridge.scheme)
  }
}

@objcMembers
public final class OneNativeGridView: OneNativeContainerView {
  private let model: GridModel
  private let bridge: OneNativeSchemeBridge
  private var traitRegistration: NSObjectProtocol?

  public init() {
    let model = GridModel()
    let bridge = OneNativeSchemeBridge()
    self.model = model
    self.bridge = bridge
    super.init(wrap: { children, standalone in
      AnyView(GridContent(model: model, children: children, standalone: standalone, bridge: bridge))
    })
    traitRegistration = registerForTraitChanges([UITraitUserInterfaceStyle.self]) {
      [weak bridge] (view: OneNativeGridView, _: UITraitCollection) in
      bridge?.sync(view.traitCollection)
    }
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) is unavailable") }

  public override func didMoveToWindow() {
    bridge.sync(traitCollection)
    super.didMoveToWindow()
  }

  public func configure(alignment: String, horizontalSpacing: String, verticalSpacing: String) {
    if model.alignment != alignment { model.alignment = alignment }
    if model.horizontalSpacing != horizontalSpacing { model.horizontalSpacing = horizontalSpacing }
    if model.verticalSpacing != verticalSpacing { model.verticalSpacing = verticalSpacing }
  }
}
