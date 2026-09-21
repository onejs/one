import SwiftUI
import UIKit

private final class SectionModel: ObservableObject {
  @Published var title = ""
  @Published var footer = ""
  // the list modifiers travel as the same style struct rows take through swiftStyle, so
  // one resolver draws each modifier at every level. nothing else in the style is set.
  @Published var listModifiers = OneNativeStyle()
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
    .oneNativeListRowSeparator(model.listModifiers)
    .oneNativeListRowInsets(model.listModifiers)
    .oneNativeListSectionSpacing(model.listModifiers)
    .oneNativeListSectionMargins(model.listModifiers)
    .oneNativeHeaderProminence(model.listModifiers)
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

  public func configure(
    title: String, footer: String, listRowSeparator: String,
    listRowSeparatorEdges: String, listRowInsetsTop: Double,
    listRowInsetsLeading: Double, listRowInsetsBottom: Double,
    listRowInsetsTrailing: Double, listSectionSpacing: String,
    listSectionSpacingValue: Double, listSectionMarginsLength: Double,
    listSectionMarginsEdges: String, headerProminence: String
  ) {
    if model.title != title { model.title = title }
    if model.footer != footer { model.footer = footer }
    // negative is how React Native says the caller left a number out, and an empty
    // string says the same for an enum; both stay nil in the style.
    var next = OneNativeStyle()
    if !listRowSeparator.isEmpty { next.listRowSeparator = listRowSeparator }
    if !listRowSeparatorEdges.isEmpty { next.listRowSeparatorEdges = listRowSeparatorEdges }
    if listRowInsetsTop >= 0 { next.listRowInsetsTop = listRowInsetsTop }
    if listRowInsetsLeading >= 0 { next.listRowInsetsLeading = listRowInsetsLeading }
    if listRowInsetsBottom >= 0 { next.listRowInsetsBottom = listRowInsetsBottom }
    if listRowInsetsTrailing >= 0 { next.listRowInsetsTrailing = listRowInsetsTrailing }
    if !listSectionSpacing.isEmpty { next.listSectionSpacing = listSectionSpacing }
    if listSectionSpacingValue >= 0 { next.listSectionSpacingValue = listSectionSpacingValue }
    if listSectionMarginsLength >= 0 { next.listSectionMarginsLength = listSectionMarginsLength }
    if !listSectionMarginsEdges.isEmpty { next.listSectionMarginsEdges = listSectionMarginsEdges }
    if !headerProminence.isEmpty { next.headerProminence = headerProminence }
    if model.listModifiers != next { model.listModifiers = next }
  }
}
