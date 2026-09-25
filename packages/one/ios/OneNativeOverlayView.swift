import SwiftUI
import UIKit

private final class OverlayModel: ObservableObject {
  @Published var alignment = "center"
  @Published var slotName = ""
  @Published var slotValues = "[]"
  @Published var overlay: AnyView?
  var onSDKEvent: ((String, String) -> Void)?

  func emitSDKEvent(_ name: String, _ value: String) {
    onSDKEvent?(name, value)
  }
}

private struct OverlayRoot: View {
  @ObservedObject var model: OverlayModel
  @ObservedObject var children: OneNativeChildren
  let standalone: Bool
  @ObservedObject var bridge: OneNativeSchemeBridge

  var body: some View {
    let base = Group {
      ForEach(children.items) { child in child.content }
    }
    Group {
      if model.slotName.isEmpty {
        base.overlay(alignment: alignment) {
          if let overlay = model.overlay { overlay }
        }
      } else {
        base.oneNativeViewSlot(model.slotName, values: model.slotValues, emit: model.emitSDKEvent) {
          model.overlay ?? AnyView(EmptyView())
        }
      }
    }.oneNativeScheme(standalone, bridge.scheme)
  }

  // every value the TypeScript side accepts has a case here, so an unknown one cannot
  // reach the view and quietly land somewhere the props did not ask for.
  private var alignment: Alignment {
    switch model.alignment {
    case "topLeading": return .topLeading
    case "top": return .top
    case "topTrailing": return .topTrailing
    case "leading": return .leading
    case "center": return .center
    case "trailing": return .trailing
    case "bottomLeading": return .bottomLeading
    case "bottom": return .bottom
    case "bottomTrailing": return .bottomTrailing
    default: preconditionFailure("invalid Swift.Overlay alignment: \(model.alignment)")
    }
  }
}

private struct OverlayContentGroup: View {
  @ObservedObject var children: OneNativeChildren

  var body: some View {
    ForEach(children.items) { child in child.content }
  }
}

@objcMembers
public final class OneNativeOverlayContentView: OneNativeContainerView {
  public init() {
    super.init(wrap: { children, _ in
      AnyView(OverlayContentGroup(children: children))
    })
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) is unavailable") }
}

@objcMembers
public final class OneNativeOverlayView: OneNativeContainerView {
  public var onSDKEvent: ((String, String) -> Void)?
  private let model: OverlayModel
  private let bridge: OneNativeSchemeBridge
  private var traitRegistration: NSObjectProtocol?
  private var markers: [UIView] = []

  public init() {
    let model = OverlayModel()
    let bridge = OneNativeSchemeBridge()
    self.model = model
    self.bridge = bridge
    super.init(wrap: { children, standalone in
      AnyView(OverlayRoot(model: model, children: children, standalone: standalone, bridge: bridge))
    })
    model.onSDKEvent = { [weak self] name, value in self?.onSDKEvent?(name, value) }
    traitRegistration = registerForTraitChanges([UITraitUserInterfaceStyle.self]) {
      [weak bridge] (view: OneNativeOverlayView, _: UITraitCollection) in
      bridge?.sync(view.traitCollection)
    }
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) is unavailable") }

  public override func didMoveToWindow() {
    bridge.sync(traitCollection)
    super.didMoveToWindow()
  }

  public func configure(alignment: String, slotName: String, slotValues: String) {
    if model.alignment != alignment { model.alignment = alignment }
    if model.slotName != slotName { model.slotName = slotName }
    if model.slotValues != slotValues { model.slotValues = slotValues }
  }

  // an overlay-content marker carries the overlay subtree, so it is captured rather
  // than published with the base content. anything else is base content.
  public override func insertChild(_ child: UIView, at index: Int) {
    guard child is OneNativeOverlayContentView else {
      super.insertChild(child, at: index)
      return
    }
    markers.append(child)
    (child as? OneNativeComposable)?.composeInto(self)
    model.overlay = (child as? OneNativeComposable)?.compositionContent()
  }

  public override func removeChild(_ child: UIView) {
    guard markers.contains(where: { $0 === child }) else {
      super.removeChild(child)
      return
    }
    markers.removeAll { $0 === child }
    (child as? OneNativeComposable)?.decompose()
    model.overlay = (markers.last as? OneNativeComposable)?.compositionContent()
  }

  public override func reset() {
    for marker in markers { (marker as? OneNativeComposable)?.decompose() }
    markers.removeAll()
    model.overlay = nil
    super.reset()
  }
}
