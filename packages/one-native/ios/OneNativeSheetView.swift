import SwiftUI
import UIKit

final class OneNativeSheetModel: ObservableObject {
  @Published var controlled = OneNativeControlled(false)
  @Published var content: UIView?
  @Published var detents: Set<PresentationDetent> = [.large]
  @Published var selectedDetent = OneNativeControlled("")
  @Published var fitToContents = false
  @Published var fittedHeight: CGFloat = 0
  @Published var presentationDragIndicator = "automatic"
  @Published var interactiveDismissDisabled = false
  @Published var presentationBackground: UIColor?
  @Published var presentationBackgroundInteraction = "automatic"
  @Published var presentationBackgroundInteractionDetent: PresentationDetent = .large
  @Published var presentationContentInteraction = "automatic"
  @Published var presentationSizing = "automatic"
  var detentValues: [(key: String, type: String, value: Double, detent: PresentationDetent)] = [
    ("large:0", "large", 0, .large)
  ]
  var controlsSelectedDetent = false
  @Published var presentation = "sheet"
  var active = false
  var onChange: ((Bool, Int, Int) -> Void)?
  var onDetentChange: ((String, Double, Int, Int) -> Void)?
  var onDismiss: ((Int) -> Void)?
  var onLayout: ((CGRect) -> Void)?
  func change(_ value: Bool) {
    guard active, controlled.value != value else { return }
    controlled.change(value)
    onChange?(value, controlled.eventCount, controlled.revision)
  }
  func dismissed() { if active { onDismiss?(controlled.revision) } }

  var selectedPresentationDetent: PresentationDetent {
    detentValues.first(where: { $0.key == selectedDetent.value })?.detent
      ?? detentValues.first?.detent
      ?? .large
  }

  func changeDetent(_ detent: PresentationDetent) {
    guard active,
      let next = detentValues.first(where: { $0.detent == detent }),
      selectedDetent.value != next.key
    else { return }
    selectedDetent.change(next.key)
    if controlsSelectedDetent {
      onDetentChange?(
        next.type, next.value, selectedDetent.eventCount, selectedDetent.revision)
    }
  }

  func setFittedHeight(_ height: CGFloat) {
    guard height.isFinite, height > 0, abs(fittedHeight - height) >= 0.5 else { return }
    fittedHeight = height
  }
}

@objcMembers public final class OneNativeSheetView: UIView {
  public var onChange: ((Bool, Int, Int) -> Void)?
  public var onDetentChange: ((String, Double, Int, Int) -> Void)?
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
  public func setFittedHeight(_ height: CGFloat) { model.setFittedHeight(height) }
  public func setDetents(_ detents: [[String: Any]]) {
    let values = detents.map { item -> (key: String, type: String, value: Double, detent: PresentationDetent) in
      let type = item["type"] as! String
      let value = item["value"] as! Double
      let detent: PresentationDetent
      switch type {
      case "medium": detent = .medium
      case "large": detent = .large
      case "fraction": detent = .fraction(value)
      case "height": detent = .height(value)
      default: preconditionFailure("invalid presentation detent")
      }
      return ("\(type):\(value)", type, value, detent)
    }
    let next = Set(values.map(\.detent))
    if model.detents != next {
      model.detentValues = values
      model.detents = next
      if !values.contains(where: { $0.key == model.selectedDetent.value }),
        let first = values.first
      {
        model.selectedDetent = OneNativeControlled(first.key)
      }
    } else {
      model.detentValues = values
    }
  }
  public func configure(
    _ isPresented: Bool, acknowledgedEvent: Int, revision: Int,
    fitToContents: Bool, selectedDetentType: String, selectedDetentValue: Double,
    acknowledgedDetentEvent: Int, detentRevision: Int,
    interactiveDismissDisabled: Bool, presentationDragIndicator: String,
    presentationBackground: UIColor?, presentationBackgroundInteraction: String,
    presentationBackgroundInteractionDetentType: String,
    presentationBackgroundInteractionDetentValue: Double,
    presentationContentInteraction: String, presentationSizing: String, presentation: String
  ) {
    if let next = model.controlled.applying(isPresented, acknowledged: acknowledgedEvent, revision: revision) { model.controlled = next }
    let controlsSelectedDetent = !selectedDetentType.isEmpty
    if controlsSelectedDetent {
      let key = "\(selectedDetentType):\(selectedDetentValue)"
      if !model.controlsSelectedDetent {
        model.selectedDetent = OneNativeControlled(key)
      } else if let next = model.selectedDetent.applying(
        key, acknowledged: acknowledgedDetentEvent, revision: detentRevision)
      {
        model.selectedDetent = next
      }
    }
    model.controlsSelectedDetent = controlsSelectedDetent
    if model.fitToContents != fitToContents {
      model.fitToContents = fitToContents
      model.fittedHeight = 0
      model.content?.setNeedsLayout()
    }
    if model.interactiveDismissDisabled != interactiveDismissDisabled { model.interactiveDismissDisabled = interactiveDismissDisabled }
    if model.presentationDragIndicator != presentationDragIndicator { model.presentationDragIndicator = presentationDragIndicator }
    if model.presentation != presentation { model.presentation = presentation }
    if model.presentationBackground != presentationBackground { model.presentationBackground = presentationBackground }
    if model.presentationBackgroundInteraction != presentationBackgroundInteraction {
      model.presentationBackgroundInteraction = presentationBackgroundInteraction
    }
    let interactionDetent = Self.detent(
      type: presentationBackgroundInteractionDetentType,
      value: presentationBackgroundInteractionDetentValue)
    if model.presentationBackgroundInteractionDetent != interactionDetent {
      model.presentationBackgroundInteractionDetent = interactionDetent
    }
    if model.presentationContentInteraction != presentationContentInteraction {
      model.presentationContentInteraction = presentationContentInteraction
    }
    if model.presentationSizing != presentationSizing { model.presentationSizing = presentationSizing }
  }

  private static func detent(type: String, value: Double) -> PresentationDetent {
    switch type {
    case "medium": return .medium
    case "fraction": return .fraction(value)
    case "height": return .height(value)
    default: return .large
    }
  }
  public override func didMoveToWindow() { super.didMoveToWindow(); updateHost() }
  public override func layoutSubviews() { super.layoutSubviews(); updateHost() }
  private func updateHost() {
    model.active = false
    guard window != nil else { controller?.detach(); return }
    if controller == nil {
      model.onChange = { [weak self] value, count, revision in self?.onChange?(value, count, revision) }
      model.onDetentChange = { [weak self] type, value, count, revision in
        self?.onDetentChange?(type, value, count, revision)
      }
      model.onDismiss = { [weak self] revision in self?.onDismiss?(revision) }
      controller = OneNativeHostingController(rootView: OneNativeSheetRoot(model: model))
    }
    controller?.attach(to: self)
    model.active = controller?.parent != nil
  }
  public func reset() {
    model.active = false; model.onChange = nil; model.onDetentChange = nil; model.onDismiss = nil; model.onLayout = nil
    controller?.presentedViewController?.dismiss(animated: false)
    controller?.detach(); controller = nil; model = OneNativeSheetModel()
  }
}
