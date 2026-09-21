import SwiftUI
import UIKit

private final class ListModel: ObservableObject {
  @Published var listStyle = "automatic"
  // the list modifiers travel as the same style struct rows take through swiftStyle, so
  // one resolver draws each modifier at every level. nothing else in the style is set.
  @Published var listModifiers = OneNativeStyle()
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
    .oneNativeListRowSeparator(model.listModifiers)
    .oneNativeListRowInsets(model.listModifiers)
    .oneNativeListSectionSpacing(model.listModifiers)
    .oneNativeListSectionMargins(model.listModifiers)
    .oneNativeHeaderProminence(model.listModifiers)
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

  public func configure(
    listStyle: String, listRowSeparator: String, listRowSeparatorEdges: String,
    listRowInsetsTop: Double, listRowInsetsLeading: Double, listRowInsetsBottom: Double,
    listRowInsetsTrailing: Double, listSectionSpacing: String,
    listSectionSpacingValue: Double, listSectionMarginsLength: Double,
    listSectionMarginsEdges: String, headerProminence: String
  ) {
    if model.listStyle != listStyle { model.listStyle = listStyle }
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
