import SwiftUI
import UIKit

private final class ListModel: ObservableObject {
  @Published var listStyle = "automatic"
}

private struct ListContent: View {
  @ObservedObject var model: ListModel
  @ObservedObject var children: OneNativeChildren
  let standalone: Bool
  @ObservedObject var bridge: OneNativeSchemeBridge

  var body: some View {
    List {
      ForEach(children.items) { child in child.content }
    }
    .oneNativeListStyle(model.listStyle)
    .oneNativeScheme(standalone, bridge.scheme)
  }
}

@objcMembers
public final class OneNativeListView: OneNativeContainerView {
  private let model: ListModel
  private let bridge: OneNativeSchemeBridge
  private var traitRegistration: NSObjectProtocol?

  public init() {
    let model = ListModel()
    let bridge = OneNativeSchemeBridge()
    self.model = model
    self.bridge = bridge
    super.init(wrap: { children, standalone in
      AnyView(ListContent(model: model, children: children, standalone: standalone, bridge: bridge))
    })
    traitRegistration = registerForTraitChanges([UITraitUserInterfaceStyle.self]) {
      [weak bridge] (view: OneNativeListView, _: UITraitCollection) in
      bridge?.sync(view.traitCollection)
    }
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) is unavailable") }

  public override func didMoveToWindow() {
    bridge.sync(traitCollection)
    super.didMoveToWindow()
  }

  public func configure(listStyle: String) {
    if model.listStyle != listStyle { model.listStyle = listStyle }
  }
}
