import SwiftUI
import UIKit

private final class SwipeActionsModel: ObservableObject {
  @Published var leading: AnyView?
  @Published var leadingFullSwipe = true
  @Published var trailing: AnyView?
  @Published var trailingFullSwipe = true
}

private struct SwipeActionsContent: View {
  @ObservedObject var model: SwipeActionsModel
  @ObservedObject var children: OneNativeChildren
  let standalone: Bool
  @ObservedObject var bridge: OneNativeSchemeBridge

  var body: some View {
    Group {
      ForEach(children.items) { child in child.content }
    }
    .swipeActions(edge: .leading, allowsFullSwipe: model.leadingFullSwipe) {
      if let leading = model.leading { leading }
    }
    .swipeActions(edge: .trailing, allowsFullSwipe: model.trailingFullSwipe) {
      if let trailing = model.trailing { trailing }
    }
    .oneNativeScheme(standalone, bridge.scheme)
  }
}

private struct SwipeActionsGroup: View {
  @ObservedObject var children: OneNativeChildren

  var body: some View {
    ForEach(children.items) { child in child.content }
  }
}

@objcMembers
public final class OneNativeSwipeActionsActionsView: OneNativeContainerView {
  // the parent reads these when the group mounts, so they are plain state rather
  // than published: changing edges mid-life is restructuring, not an update.
  public var edge = "trailing"
  public var allowsFullSwipe = true

  public init() {
    super.init(wrap: { children, _ in
      AnyView(SwipeActionsGroup(children: children))
    })
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) is unavailable") }

  public func configure(edge: String, allowsFullSwipe: Bool) {
    if self.edge != edge { self.edge = edge }
    if self.allowsFullSwipe != allowsFullSwipe { self.allowsFullSwipe = allowsFullSwipe }
  }
}

@objcMembers
public final class OneNativeSwipeActionsView: OneNativeContainerView {
  private let model: SwipeActionsModel
  private let bridge: OneNativeSchemeBridge
  private var traitRegistration: NSObjectProtocol?
  private var markers: [OneNativeSwipeActionsActionsView] = []

  public init() {
    let model = SwipeActionsModel()
    let bridge = OneNativeSchemeBridge()
    self.model = model
    self.bridge = bridge
    super.init(wrap: { children, standalone in
      AnyView(SwipeActionsContent(model: model, children: children, standalone: standalone, bridge: bridge))
    })
    traitRegistration = registerForTraitChanges([UITraitUserInterfaceStyle.self]) {
      [weak bridge] (view: OneNativeSwipeActionsView, _: UITraitCollection) in
      bridge?.sync(view.traitCollection)
    }
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) is unavailable") }

  public override func didMoveToWindow() {
    bridge.sync(traitCollection)
    super.didMoveToWindow()
  }

  // an actions marker carries one edge's buttons, so it is captured into that edge's
  // slot rather than published with the row content. anything else is row content.
  public override func insertChild(_ child: UIView, at index: Int) {
    guard let marker = child as? OneNativeSwipeActionsActionsView else {
      super.insertChild(child, at: index)
      return
    }
    markers.append(marker)
    marker.composeInto(self)
    publish(marker)
  }

  public override func removeChild(_ child: UIView) {
    guard markers.contains(where: { $0 === child }) else {
      super.removeChild(child)
      return
    }
    markers.removeAll { $0 === child }
    (child as? OneNativeComposable)?.decompose()
    republish()
  }

  public override func reset() {
    for marker in markers { marker.decompose() }
    markers.removeAll()
    model.leading = nil
    model.trailing = nil
    super.reset()
  }

  private func publish(_ marker: OneNativeSwipeActionsActionsView) {
    if marker.edge == "leading" {
      model.leading = marker.compositionContent()
      model.leadingFullSwipe = marker.allowsFullSwipe
    } else {
      model.trailing = marker.compositionContent()
      model.trailingFullSwipe = marker.allowsFullSwipe
    }
  }

  private func republish() {
    model.leading = nil
    model.trailing = nil
    for marker in markers { publish(marker) }
  }
}
