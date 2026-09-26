import SwiftUI
import UIKit

private final class LazyVGridModel: ObservableObject {
  @Published var columns = "[]"
  @Published var alignment = "center"
  @Published var spacing = "null"
}

private struct LazyVGridContent: View {
  @ObservedObject var model: LazyVGridModel
  @ObservedObject var children: OneNativeChildren
  let standalone: Bool
  @ObservedObject var bridge: OneNativeSchemeBridge

  var body: some View {
    LazyVGrid(
      columns: OneNativeGridValues.items(model.columns, "Swift.LazyVGrid"),
      alignment: OneNativeGridValues.horizontal(model.alignment, "Swift.LazyVGrid"),
      spacing: OneNativeGridValues.optional(model.spacing, "Swift.LazyVGrid")
    ) {
      ForEach(children.items) { child in child.content }
    }
    .oneNativeScheme(standalone, bridge.scheme)
  }
}

@objcMembers
public final class OneNativeLazyVGridView: OneNativeContainerView {
  private let model: LazyVGridModel
  private let bridge: OneNativeSchemeBridge
  private var traitRegistration: NSObjectProtocol?

  public init() {
    let model = LazyVGridModel()
    let bridge = OneNativeSchemeBridge()
    self.model = model
    self.bridge = bridge
    super.init(wrap: { children, standalone in
      AnyView(LazyVGridContent(model: model, children: children, standalone: standalone, bridge: bridge))
    })
    traitRegistration = registerForTraitChanges([UITraitUserInterfaceStyle.self]) {
      [weak bridge] (view: OneNativeLazyVGridView, _: UITraitCollection) in
      bridge?.sync(view.traitCollection)
    }
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) is unavailable") }

  public override func didMoveToWindow() {
    bridge.sync(traitCollection)
    super.didMoveToWindow()
  }

  public func configure(columns: String, alignment: String, spacing: String) {
    if model.columns != columns { model.columns = columns }
    if model.alignment != alignment { model.alignment = alignment }
    if model.spacing != spacing { model.spacing = spacing }
  }
}
