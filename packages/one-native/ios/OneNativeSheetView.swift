import SwiftUI
import UIKit

final class OneNativeSheetModel: ObservableObject {
  @Published var controlled = OneNativeControlled(false)
  @Published var content: UIView?
  @Published var detents: Set<PresentationDetent> = [.large]
  @Published var presentationDragIndicator = "automatic"
  @Published var interactiveDismissDisabled = false
  @Published var presentation = "sheet"
  var active = false
  var onChange: ((Bool, Int, Int) -> Void)?
  var onDismiss: ((Int) -> Void)?
  var onLayout: ((CGRect) -> Void)?
  func change(_ value: Bool) {
    guard active, controlled.value != value else { return }
    controlled.change(value)
    onChange?(value, controlled.eventCount, controlled.revision)
  }
  func dismissed() { if active { onDismiss?(controlled.revision) } }
}

@objcMembers public final class OneNativeSheetView: UIView {
  public var onChange: ((Bool, Int, Int) -> Void)?
  public var onDismiss: ((Int) -> Void)?
  private var model = OneNativeSheetModel()
  private var controller: OneNativeHostingController<OneNativeSheetRoot>?
  public override init(frame: CGRect) { super.init(frame: frame) }
  required init?(coder: NSCoder) { fatalError("init(coder:) is unavailable") }
  public func mountContent(_ view: UIView, onLayout: @escaping (CGRect) -> Void) {
    model.onLayout = onLayout
    model.content = view
  }
  public func unmountContent(_ view: UIView) {
    model.onLayout = nil
    if model.content === view { model.content = nil }
    view.removeFromSuperview()
  }
  public func setDetents(_ detents: [[String: Any]]) {
    let next = Set(detents.map { item -> PresentationDetent in
      switch item["type"] as! String {
      case "medium": return .medium
      case "large": return .large
      case "fraction": return .fraction(item["value"] as! Double)
      case "height": return .height(item["value"] as! Double)
      default: preconditionFailure("invalid presentation detent")
      }
    })
    if model.detents != next { model.detents = next }
  }
  public func configure(_ isPresented: Bool, acknowledgedEvent: Int, revision: Int, interactiveDismissDisabled: Bool, presentationDragIndicator: String, presentation: String) {
    if let next = model.controlled.applying(isPresented, acknowledged: acknowledgedEvent, revision: revision) { model.controlled = next }
    if model.interactiveDismissDisabled != interactiveDismissDisabled { model.interactiveDismissDisabled = interactiveDismissDisabled }
    if model.presentationDragIndicator != presentationDragIndicator { model.presentationDragIndicator = presentationDragIndicator }
    if model.presentation != presentation { model.presentation = presentation }
  }
  public override func didMoveToWindow() { super.didMoveToWindow(); updateHost() }
  public override func layoutSubviews() { super.layoutSubviews(); updateHost() }
  private func updateHost() {
    model.active = false
    guard window != nil else { controller?.detach(); return }
    if controller == nil {
      model.onChange = { [weak self] value, count, revision in self?.onChange?(value, count, revision) }
      model.onDismiss = { [weak self] revision in self?.onDismiss?(revision) }
      controller = OneNativeHostingController(rootView: OneNativeSheetRoot(model: model))
    }
    controller?.attach(to: self)
    model.active = controller?.parent != nil
  }
  public func reset() {
    model.active = false; model.onChange = nil; model.onDismiss = nil; model.onLayout = nil
    controller?.presentedViewController?.dismiss(animated: false)
    controller?.detach(); controller = nil; model = OneNativeSheetModel()
  }
}
