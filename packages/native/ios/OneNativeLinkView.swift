import SwiftUI
import UIKit

private final class LinkModel: ObservableObject {
  @Published var destination = ""
  @Published var label = ""
}

private struct LinkContent: View {
  @ObservedObject var model: LinkModel
  @ObservedObject var children: OneNativeChildren

  var body: some View {
    // the destination parsed in TypeScript, so this unwraps; a string Foundation
    // rejects anyway degrades to plain content rather than crashing.
    if let url = URL(string: model.destination) {
      Link(destination: url) { labelContent }
    } else {
      labelContent
    }
  }

  @ViewBuilder private var labelContent: some View {
    if children.items.isEmpty { Text(model.label) }
    else { ForEach(children.items) { child in child.content } }
  }
}

@objcMembers
public final class OneNativeLinkView: OneNativeContainerView {
  private let model: LinkModel

  public init() {
    let model = LinkModel()
    self.model = model
    super.init(wrap: { children, _ in
      AnyView(LinkContent(model: model, children: children))
    })
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) is unavailable") }

  public func configure(destination: String, label: String) {
    if model.destination != destination { model.destination = destination }
    if model.label != label { model.label = label }
  }
}
