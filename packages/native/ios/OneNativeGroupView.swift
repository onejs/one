import SwiftUI
import UIKit

private struct GroupContent: View {
  @ObservedObject var children: OneNativeChildren
  let standalone: Bool
  @ObservedObject var bridge: OneNativeSchemeBridge

  var body: some View {
    Group { ForEach(children.items) { child in child.content } }
      .oneNativeScheme(standalone, bridge.scheme)
  }
}

@objcMembers
public final class OneNativeGroupView: OneNativeContainerView {
  private let bridge: OneNativeSchemeBridge
  private var traitRegistration: NSObjectProtocol?

  public init() {
    let bridge = OneNativeSchemeBridge()
    self.bridge = bridge
    super.init(wrap: { children, standalone in
      AnyView(GroupContent(children: children, standalone: standalone, bridge: bridge))
    })
    traitRegistration = registerForTraitChanges([UITraitUserInterfaceStyle.self]) {
      [weak bridge] (view: OneNativeGroupView, _: UITraitCollection) in
      bridge?.sync(view.traitCollection)
    }
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) is unavailable") }

  public override func didMoveToWindow() {
    bridge.sync(traitCollection)
    super.didMoveToWindow()
  }
}
