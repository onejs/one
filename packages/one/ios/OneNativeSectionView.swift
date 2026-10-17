import SwiftUI
import UIKit

private final class SectionModel: ObservableObject {
  @Published var title = ""
  @Published var footer = ""
}

private struct SectionContent: View {
  @ObservedObject var model: SectionModel
  @ObservedObject var children: OneNativeChildren
  @ObservedObject var style: OneNativeContainerStyle

  var body: some View {
    Section {
      ForEach(children.items) { child in child.content }
    } header: {
      if !model.title.isEmpty { Text(model.title) }
    } footer: {
      if !model.footer.isEmpty { Text(model.footer) }
    }
    .oneNativeContainerStyle(style, evenWhenEmpty: true)
  }
}

@objcMembers
public final class OneNativeSectionView: OneNativeContainerView {
  private let model: SectionModel

  public init() {
    let model = SectionModel()
    self.model = model
    super.init(styled: { children, style, _ in
      AnyView(SectionContent(model: model, children: children, style: style))
    })
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) is unavailable") }

  public func configure(title: String, footer: String) {
    if model.title != title { model.title = title }
    if model.footer != footer { model.footer = footer }
  }

  // a section's own modifiers are read when SwiftUI creates the section.
  @nonobjc override func isRowModifier(_ name: String) -> Bool {
    name.hasPrefix("listSection") || name == "headerProminence"
  }

  public override func reset() {
    model.title = ""
    model.footer = ""
    super.reset()
  }
}
