import SwiftUI
import UIKit

private final class ListModel: ObservableObject {
  @Published var listStyle = "automatic"
  @Published var swiftStyle = OneNativeStyle()
  var active = false
  var onSDKEvent: ((String, String) -> Void)?
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
    List {
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

  public func configure(listStyle: String) {
    if model.listStyle != listStyle { model.listStyle = listStyle }
  }

  public func configureStyle(_ style: [String: Any]) {
    let next = OneNativeStyle(dictionary: style)
    if model.swiftStyle != next { model.swiftStyle = next }
  }

  public override func setActive(_ active: Bool) { model.active = active }

  public override func reset() {
    model.listStyle = "automatic"
    model.swiftStyle = OneNativeStyle()
    super.reset()
  }
}
