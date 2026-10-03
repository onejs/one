import SwiftUI
import UIKit

private final class ScrollViewModel: ObservableObject {
  @Published var axes = "vertical"
  @Published var showsIndicators = true
  @Published var swiftStyle = OneNativeStyle()
  var active = false
  var onSDKEvent: ((String, String) -> Void)?
  func emitSDKEvent(_ name: String, _ value: String) {
    if active { onSDKEvent?(name, value) }
  }
}

private struct ScrollViewContent: View {
  @ObservedObject var model: ScrollViewModel
  @ObservedObject var children: OneNativeChildren
  let standalone: Bool
  @ObservedObject var bridge: OneNativeSchemeBridge

  var body: some View {
    ScrollView(axes, showsIndicators: model.showsIndicators) {
      ForEach(children.items) { child in child.content }
        .scrollTargetLayout()
    }
    .oneNativeStyle(model.swiftStyle, emit: model.emitSDKEvent)
    .oneNativeScheme(standalone, bridge.scheme)
  }

  // every value the TypeScript side accepts has a case here, so an unknown one cannot
  // reach the view and quietly scroll the wrong way.
  private var axes: Axis.Set {
    switch model.axes {
    case "vertical": return .vertical
    case "horizontal": return .horizontal
    case "both": return [.horizontal, .vertical]
    default: preconditionFailure("invalid Swift.ScrollView axes: \(model.axes)")
    }
  }
}

@objcMembers
public final class OneNativeScrollViewView: OneNativeContainerView {
  public var onSDKEvent: ((String, String) -> Void)?
  private let model: ScrollViewModel
  private let bridge: OneNativeSchemeBridge
  private var traitRegistration: NSObjectProtocol?

  public init() {
    let model = ScrollViewModel()
    let bridge = OneNativeSchemeBridge()
    self.model = model
    self.bridge = bridge
    super.init(wrap: { children, standalone in
      AnyView(ScrollViewContent(model: model, children: children, standalone: standalone, bridge: bridge))
    })
    model.onSDKEvent = { [weak self] name, value in self?.onSDKEvent?(name, value) }
    traitRegistration = registerForTraitChanges([UITraitUserInterfaceStyle.self]) {
      [weak bridge] (view: OneNativeScrollViewView, _: UITraitCollection) in
      bridge?.sync(view.traitCollection)
    }
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) is unavailable") }

  public override func didMoveToWindow() {
    bridge.sync(traitCollection)
    super.didMoveToWindow()
  }

  public func configure(axes: String, showsIndicators: Bool) {
    if model.axes != axes { model.axes = axes }
    if model.showsIndicators != showsIndicators {
      model.showsIndicators = showsIndicators
    }
  }

  public func configureStyle(_ style: [String: Any]) {
    let next = OneNativeStyle(dictionary: style)
    if model.swiftStyle != next { model.swiftStyle = next }
  }

  public override func setActive(_ active: Bool) { model.active = active }

  public override func reset() {
    model.axes = "vertical"
    model.showsIndicators = true
    model.swiftStyle = OneNativeStyle()
    super.reset()
  }
}
