import SwiftUI
import UIKit

// one entry a toolbar marker published. an entry is SwiftUI ToolbarContent, not a view:
// that is what .toolbar { } builds, and the hosting NavigationStack renders the entries
// with a ForEach the way SwiftUI itself composes toolbar content.
struct OneNativeToolbarEntry: Identifiable {
  enum Kind { case item, group, spacer }

  let id: ObjectIdentifier
  let kind: Kind
  let placement: String
  let sizing: String
  let label: String
  let systemImage: String
  let content: AnyView?
}

// a group is labelled when it carries a label and plain otherwise: the two initializers
// SwiftUI declares for ToolbarItemGroup.
struct OneNativeToolbarEntryContent: ToolbarContent {
  let entry: OneNativeToolbarEntry

  var body: some ToolbarContent {
    switch entry.kind {
    case .item:
      ToolbarItem(placement: OneNativeGenerated.toolbarItemPlacement(entry.placement)) {
        entry.content ?? AnyView(EmptyView())
      }
    case .group:
      if entry.label.isEmpty {
        ToolbarItemGroup(placement: OneNativeGenerated.toolbarItemPlacement(entry.placement)) {
          entry.content ?? AnyView(EmptyView())
        }
      } else {
        ToolbarItemGroup(
          placement: OneNativeGenerated.toolbarItemPlacement(entry.placement),
          content: { entry.content ?? AnyView(EmptyView()) },
          label: {
            if entry.systemImage.isEmpty { Text(entry.label) }
            else { Label(entry.label, systemImage: entry.systemImage) }
          })
      }
    case .spacer:
      // ToolbarSpacer is iOS 26 API and React rejects it below that, so this branch only
      // ever runs where the SDK declares the type.
      if #available(iOS 26.0, *) {
        ToolbarSpacer(
          OneNativeGenerated.spacerSizing(entry.sizing),
          placement: OneNativeGenerated.toolbarItemPlacement(entry.placement))
      }
    }
  }
}

final class OneNativeToolbarMarkerModel: ObservableObject {
  @Published var kind = "item"
  @Published var placement = "automatic"
  @Published var sizing = "flexible"
  @Published var label = ""
  @Published var systemImage = ""
  @Published var swiftStyle = OneNativeStyle()
  var onEntryChange: (() -> Void)?
  var onSDKEvent: ((String, String) -> Void)?
  func emitSDKEvent(_ name: String, _ value: String) { onSDKEvent?(name, value) }
}

private struct OneNativeToolbarMarkerContent: View {
  @ObservedObject var model: OneNativeToolbarMarkerModel
  @ObservedObject var children: OneNativeChildren

  var body: some View {
    ForEach(children.items) { child in child.content }
      .oneNativeStyle(model.swiftStyle, emit: model.emitSDKEvent)
  }
}

// a ToolbarItem, a ToolbarItemGroup, or a ToolbarSpacer. all three are the same marker:
// they compose their children and hand the hosting bar one entry to render, and they
// render nothing where they sit.
@objcMembers
public final class OneNativeToolbarMarkerView: OneNativeContainerView {
  private let model: OneNativeToolbarMarkerModel

  public init() {
    let model = OneNativeToolbarMarkerModel()
    self.model = model
    super.init(wrap: { children, _ in
      AnyView(OneNativeToolbarMarkerContent(model: model, children: children))
    })
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) is unavailable") }

  public func configure(kind: String, placement: String, sizing: String, label: String, systemImage: String) {
    var changed = false
    if model.kind != kind { model.kind = kind; changed = true }
    if model.placement != placement { model.placement = placement; changed = true }
    if model.sizing != sizing { model.sizing = sizing; changed = true }
    if model.label != label { model.label = label; changed = true }
    if model.systemImage != systemImage { model.systemImage = systemImage; changed = true }
    if changed { model.onEntryChange?() }
  }

  public func configureStyle(_ style: [String: Any]) {
    let next = OneNativeStyle(dictionary: style)
    if model.swiftStyle != next { model.swiftStyle = next }
  }

  public func setOnEntryChange(_ callback: (() -> Void)?) { model.onEntryChange = callback }
  public func setOnSDKEvent(_ callback: ((String, String) -> Void)?) { model.onSDKEvent = callback }

  func entry() -> OneNativeToolbarEntry {
    let kind: OneNativeToolbarEntry.Kind =
      model.kind == "group" ? .group : model.kind == "spacer" ? .spacer : .item
    return OneNativeToolbarEntry(
      id: ObjectIdentifier(self),
      kind: kind,
      placement: model.placement,
      sizing: model.sizing,
      label: model.label,
      systemImage: model.systemImage,
      content: compositionContent()
    )
  }
}

// a marker collection: Swift.Toolbar. it owns no bar of its own, so it publishes its
// entries to the container that hosts it.
@objcMembers
public final class OneNativeToolbarView: OneNativeContainerView {
  private var markers: [OneNativeToolbarMarkerView] = []
  private weak var host: OneNativeToolbarHost?

  public init() {
    super.init(wrap: { _, _ in AnyView(EmptyView()) })
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) is unavailable") }

  var entries: [OneNativeToolbarEntry] { markers.map { $0.entry() } }

  // a toolbar only means something inside a container that has a bar. anywhere else it
  // would silently drop every item it holds.
  public override func composeInto(_ parent: OneNativeCompositionParent) {
    guard let host = parent as? OneNativeToolbarHost else {
      preconditionFailure("Swift.Toolbar must be a direct child of Swift.NavigationStack")
    }
    self.host = host
    super.composeInto(parent)
    host.toolbarChanged()
  }

  public override func decompose() {
    host = nil
    super.decompose()
  }

  // a marker is captured into the bar rather than published with content, the way an
  // overlay marker is captured into an overlay. the base still records it so activation
  // propagates into the marker's own children.
  public override func insertChild(_ child: UIView, at index: Int) {
    guard let marker = child as? OneNativeToolbarMarkerView else {
      preconditionFailure(
        "Swift.Toolbar takes Swift.ToolbarItem, Swift.ToolbarItemGroup, and Swift.ToolbarSpacer children")
    }
    marker.setOnEntryChange { [weak self] in self?.entryChanged() }
    super.insertChild(child, at: index)
    markers.insert(marker, at: min(index, markers.count))
    entryChanged()
  }

  public override func removeChild(_ child: UIView) {
    guard let marker = child as? OneNativeToolbarMarkerView,
      let index = markers.firstIndex(where: { $0 === child })
    else { return }
    markers.remove(at: index)
    marker.setOnEntryChange(nil)
    super.removeChild(child)
    entryChanged()
  }

  public override func reset() {
    for marker in markers {
      marker.setOnEntryChange(nil)
      marker.decompose()
    }
    markers.removeAll()
    host = nil
    super.reset()
  }

  private func entryChanged() { host?.toolbarChanged() }
}
