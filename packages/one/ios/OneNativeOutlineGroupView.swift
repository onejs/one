import SwiftUI
import UIKit

// the shape of an OutlineGroup's data: nodes with a stable id and children, nil for a
// leaf. React sends it as JSON and the row content as OneNativeOutlineRow children.
private struct OutlineNode: Identifiable, Decodable {
  let id: String
  let children: [OutlineNode]?
}

private final class OutlineGroupModel: ObservableObject {
  @Published var tree = "[]"
  @Published private(set) var nodes: [OutlineNode] = []
  var rows: [ObjectIdentifier: OneNativeOutlineRowView] = [:]

  func configure(tree: String) {
    guard self.tree != tree else { return }
    do { nodes = try JSONDecoder().decode([OutlineNode].self, from: Data(tree.utf8)) }
    catch { preconditionFailure("invalid Swift.OutlineGroup tree \(tree): \(error)") }
    self.tree = tree
  }
}

private struct OutlineGroupContent: View {
  @ObservedObject var model: OutlineGroupModel
  @ObservedObject var children: OneNativeChildren
  @ObservedObject var style: OneNativeContainerStyle
  let standalone: Bool
  @ObservedObject var bridge: OneNativeSchemeBridge

  var body: some View {
    OutlineGroup(model.nodes, children: \.children) { node in
      ForEach(children.items.filter { model.rows[$0.sourceID]?.rowId == node.id }) { row in
        row.content
      }
    }
    .oneNativeContainerStyle(style)
    .oneNativeScheme(standalone, bridge.scheme)
  }
}

@objcMembers
public final class OneNativeOutlineGroupView: OneNativeContainerView {
  private let model: OutlineGroupModel
  private let bridge: OneNativeSchemeBridge
  private var traitRegistration: NSObjectProtocol?

  public init() {
    let model = OutlineGroupModel()
    let bridge = OneNativeSchemeBridge()
    self.model = model
    self.bridge = bridge
    super.init(styled: { children, style, standalone in
      AnyView(
        OutlineGroupContent(
          model: model, children: children, style: style, standalone: standalone, bridge: bridge))
    })
    traitRegistration = registerForTraitChanges([UITraitUserInterfaceStyle.self]) {
      [weak bridge] (view: OneNativeOutlineGroupView, _: UITraitCollection) in
      bridge?.sync(view.traitCollection)
    }
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) is unavailable") }

  public override func didMoveToWindow() {
    bridge.sync(traitCollection)
    super.didMoveToWindow()
  }

  public func configure(tree: String) { model.configure(tree: tree) }

  public override func insertChild(_ child: UIView, at index: Int) {
    guard let row = child as? OneNativeOutlineRowView else {
      preconditionFailure("Swift.OutlineGroup rows are made by its own render function")
    }
    model.rows[ObjectIdentifier(row)] = row
    super.insertChild(child, at: index)
  }

  public override func removeChild(_ child: UIView) {
    model.rows.removeValue(forKey: ObjectIdentifier(child))
    super.removeChild(child)
  }

  public override func reset() {
    model.rows = [:]
    super.reset()
  }
}
