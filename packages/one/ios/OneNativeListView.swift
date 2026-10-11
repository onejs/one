import SwiftUI
import UIKit

private final class ListModel: ObservableObject {
  @Published var listStyle = "automatic"
  @Published var swiftStyle = OneNativeStyle()
  @Published var selectedTags = Set<String>()
  @Published var uncontrolledSelection = Set<String>()
  @Published var selectionIsControlled = false
  var active = false
  var onSDKEvent: ((String, String) -> Void)?
  var onSelectionChange: ((String) -> Void)?

  var currentSelection: Set<String> {
    selectionIsControlled ? selectedTags : uncontrolledSelection
  }

  var selectionBinding: Binding<Set<String>> {
    Binding(
      get: { [self] in currentSelection },
      set: { [self] next in
        guard next != currentSelection else { return }
        if !selectionIsControlled { uncontrolledSelection = next }
        guard active else { return }
        do {
          let data = try JSONEncoder().encode(next.sorted())
          onSelectionChange?(String(decoding: data, as: UTF8.self))
        } catch {
          preconditionFailure("invalid Swift.List selection: \(error)")
        }
      }
    )
  }

  func configureSelection(_ json: String, controlled: Bool) {
    let next: [String]
    do { next = try JSONDecoder().decode([String].self, from: Data(json.utf8)) }
    catch { preconditionFailure("invalid Swift.List selection \(json): \(error)") }
    if controlled { selectedTags = Set(next) }
    selectionIsControlled = controlled
  }

  func emitSDKEvent(_ name: String, _ value: String) {
    if active { onSDKEvent?(name, value) }
  }
}

private struct ListContent: View {
  @ObservedObject var model: ListModel
  @ObservedObject var children: OneNativeChildren
  let standalone: Bool
  @ObservedObject var bridge: OneNativeSchemeBridge

  var body: some View {
    List(selection: model.selectionBinding) {
      ForEach(children.items) { child in child.content }
    }
    .oneNativeListStyle(model.listStyle)
    .oneNativeStyle(model.swiftStyle, emit: model.emitSDKEvent)
    .oneNativeScheme(standalone, bridge.scheme)
  }
}

@objcMembers
public final class OneNativeListView: OneNativeContainerView {
  public var onSDKEvent: ((String, String) -> Void)?
  public var onSelectionChange: ((String) -> Void)?
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
    model.onSDKEvent = { [weak self] name, value in self?.onSDKEvent?(name, value) }
    model.onSelectionChange = { [weak self] selection in
      self?.onSelectionChange?(selection)
    }
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

  public func configure(listStyle: String, selection: String, selectionIsControlled: Bool) {
    if model.listStyle != listStyle { model.listStyle = listStyle }
    model.configureSelection(selection, controlled: selectionIsControlled)
  }

  public func configureStyle(_ style: [String: Any]) {
    let next = OneNativeStyle(dictionary: style)
    if model.swiftStyle != next { model.swiftStyle = next }
  }

  public override func setActive(_ active: Bool) { model.active = active }

  public override func reset() {
    model.listStyle = "automatic"
    model.swiftStyle = OneNativeStyle()
    model.selectedTags = []
    model.uncontrolledSelection = []
    model.selectionIsControlled = false
    super.reset()
  }
}
