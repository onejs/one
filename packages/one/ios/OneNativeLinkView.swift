import SwiftUI
import UIKit

private final class LinkModel: ObservableObject {
  @Published var destination = ""
  @Published var label = ""
}

private struct LinkContent: View {
  @ObservedObject var model: LinkModel
  @ObservedObject var children: OneNativeChildren
  let standalone: Bool
  @ObservedObject var bridge: OneNativeSchemeBridge

  var body: some View {
    // the destination parsed in TypeScript, so this unwraps; a string Foundation
    // rejects anyway degrades to plain content rather than crashing.
    Group {
      if let url = URL(string: model.destination) {
        Link(destination: url) { labelContent }
      } else {
        labelContent
      }
    }
    .oneNativeScheme(standalone, bridge.scheme)
  }

  @ViewBuilder private var labelContent: some View {
    if children.items.isEmpty { Text(model.label) }
    else { ForEach(children.items) { child in child.content } }
  }
}

@objcMembers
public final class OneNativeLinkView: OneNativeContainerView {
  private let model: LinkModel
  private let bridge: OneNativeSchemeBridge
  private var traitRegistration: NSObjectProtocol?

  public init() {
    let model = LinkModel()
    let bridge = OneNativeSchemeBridge()
    self.model = model
    self.bridge = bridge
    super.init(wrap: { children, standalone in
      AnyView(LinkContent(model: model, children: children, standalone: standalone, bridge: bridge))
    })
    traitRegistration = registerForTraitChanges([UITraitUserInterfaceStyle.self]) {
      [weak bridge] (view: OneNativeLinkView, _: UITraitCollection) in
      bridge?.sync(view.traitCollection)
    }
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) is unavailable") }

  public override func didMoveToWindow() {
    bridge.sync(traitCollection)
    super.didMoveToWindow()
  }

  public func configure(destination: String, label: String) {
    if model.destination != destination { model.destination = destination }
    if model.label != label { model.label = label }
  }
}
