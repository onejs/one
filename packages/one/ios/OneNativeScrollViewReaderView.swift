import SwiftUI
import UIKit

// SwiftUI hands the content builder its ScrollViewProxy; scrollTo runs on that proxy.
// the builder only stores it, since the SDK forbids using it during the build. a
// command that arrives before the reader first appears waits for the appearance, so
// none is dropped and none runs before SwiftUI has the content's scroll views.
private final class ScrollViewReaderModel {
  private var proxy: ScrollViewProxy?
  private var appeared = false
  private var pending: [(id: String, anchor: UnitPoint?)] = []

  func capture(_ proxy: ScrollViewProxy) { self.proxy = proxy }

  func appear() {
    appeared = true
    guard let proxy else { preconditionFailure("Swift.ScrollViewReader appeared without its proxy") }
    let queued = pending
    pending = []
    for command in queued { proxy.scrollTo(command.id, anchor: command.anchor) }
  }

  func scrollTo(_ id: String, anchor: UnitPoint?) {
    guard appeared, let proxy else {
      pending.append((id, anchor))
      return
    }
    proxy.scrollTo(id, anchor: anchor)
  }

  func reset() {
    proxy = nil
    appeared = false
    pending = []
  }
}

private struct ScrollViewReaderContent: View {
  let model: ScrollViewReaderModel
  @ObservedObject var children: OneNativeChildren
  let standalone: Bool
  @ObservedObject var bridge: OneNativeSchemeBridge

  var body: some View {
    ScrollViewReader { proxy in
      let _ = model.capture(proxy)
      ForEach(children.items) { child in child.content }
    }
    .onAppear { model.appear() }
    .oneNativeScheme(standalone, bridge.scheme)
  }
}

@objcMembers
public final class OneNativeScrollViewReaderView: OneNativeContainerView {
  private let model: ScrollViewReaderModel
  private let bridge: OneNativeSchemeBridge
  private var traitRegistration: NSObjectProtocol?

  public init() {
    let model = ScrollViewReaderModel()
    let bridge = OneNativeSchemeBridge()
    self.model = model
    self.bridge = bridge
    super.init(wrap: { children, standalone in
      AnyView(ScrollViewReaderContent(model: model, children: children, standalone: standalone, bridge: bridge))
    })
    traitRegistration = registerForTraitChanges([UITraitUserInterfaceStyle.self]) {
      [weak bridge] (view: OneNativeScrollViewReaderView, _: UITraitCollection) in
      bridge?.sync(view.traitCollection)
    }
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) is unavailable") }

  public override func didMoveToWindow() {
    bridge.sync(traitCollection)
    super.didMoveToWindow()
  }

  // hasAnchor false is the SDK's nil anchor; a point is UnitPoint(x:y:), which is
  // equal to the named UnitPoint constants JavaScript resolves.
  public func scrollTo(_ id: String, hasAnchor: Bool, anchorX: Double, anchorY: Double) {
    model.scrollTo(id, anchor: hasAnchor ? UnitPoint(x: anchorX, y: anchorY) : nil)
  }

  public override func reset() {
    model.reset()
    super.reset()
  }
}
