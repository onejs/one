import SwiftUI
import UIKit

private final class SectionModel: ObservableObject {
  @Published var title = ""
  @Published var footer = ""
}

private struct SectionContent: View {
  @ObservedObject var model: SectionModel
  @ObservedObject var children: OneNativeChildren

  var body: some View {
    Section {
      ForEach(children.items) { child in child.content }
    } header: {
      if !model.title.isEmpty { Text(model.title) }
    } footer: {
      if !model.footer.isEmpty { Text(model.footer) }
    }
  }
}

@objcMembers
public final class OneNativeSectionView: OneNativeContainerView {
  private let model: SectionModel

  public init() {
    let model = SectionModel()
    self.model = model
    super.init(wrap: { children, _ in
      AnyView(SectionContent(model: model, children: children))
    })
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) is unavailable") }

  public func configure(title: String, footer: String) {
    if model.title != title { model.title = title }
    if model.footer != footer { model.footer = footer }
  }
}
