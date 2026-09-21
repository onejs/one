import SwiftUI
import UIKit

final class OneNativeAdaptivePanelModel: ObservableObject {
  @Published var controlled = OneNativeControlled(false)
  @Published var content: UIView?
  @Published var detents: Set<PresentationDetent> = [.large]
  @Published var selectedDetent = OneNativeControlled("")
  @Published var regularWidth: Double = 320
  var detentValues: [(key: String, type: String, value: Double, detent: PresentationDetent)] = [
    ("large:0", "large", 0, .large)
  ]
  var controlsSelectedDetent = false
  var active = false
  var onChange: ((Bool, Int, Int) -> Void)?
  var onDetentChange: ((String, Double, Int, Int) -> Void)?
  var onLayout: ((CGRect) -> Void)?
  var onPanelLayout: ((String, CGRect) -> Void)?
  private var lastReportedPlacement = ""
  private var lastReportedFrame = CGRect.zero
  func change(_ value: Bool) {
    guard active, controlled.value != value else { return }
    controlled.change(value)
    onChange?(value, controlled.eventCount, controlled.revision)
  }

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

  func reportLayout(_ placement: String, _ frame: CGRect) {
    guard active else { return }
    let samePlacement = placement == lastReportedPlacement
    let sameFrame = abs(lastReportedFrame.origin.x - frame.origin.x) < 0.5
      && abs(lastReportedFrame.origin.y - frame.origin.y) < 0.5
      && abs(lastReportedFrame.size.width - frame.size.width) < 0.5
      && abs(lastReportedFrame.size.height - frame.size.height) < 0.5
    guard !samePlacement || !sameFrame else { return }
    lastReportedPlacement = placement
    lastReportedFrame = frame
    onPanelLayout?(placement, frame)
  }
}

@objcMembers public final class OneNativeAdaptivePanelView: UIView {
  public var onChange: ((Bool, Int, Int) -> Void)?
  public var onDetentChange: ((String, Double, Int, Int) -> Void)?
  public var onPanelLayout: ((String, CGRect) -> Void)?
  private var model = OneNativeAdaptivePanelModel()
  private var controller: OneNativeHostingController<OneNativeAdaptivePanelRoot>?
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
    let values = detents.map { item -> (key: String, type: String, value: Double, detent: PresentationDetent) in
      let type = item["type"] as! String
      let value = item["value"] as! Double
      let detent: PresentationDetent
      switch type {
      case "medium": detent = .medium
      case "large": detent = .large
      case "fraction": detent = .fraction(value)
      case "height": detent = .height(value)
      default: preconditionFailure("invalid adaptive panel detent")
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
    _ open: Bool, acknowledgedEvent: Int, revision: Int,
    selectedDetentType: String, selectedDetentValue: Double,
    acknowledgedDetentEvent: Int, detentRevision: Int,
    regularWidth: Double
  ) {
    if let next = model.controlled.applying(open, acknowledged: acknowledgedEvent, revision: revision) { model.controlled = next }
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
    if model.regularWidth != regularWidth { model.regularWidth = regularWidth }
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
      model.onPanelLayout = { [weak self] placement, frame in
        self?.onPanelLayout?(placement, frame)
      }
      controller = OneNativeHostingController(rootView: OneNativeAdaptivePanelRoot(model: model))
    }
    controller?.attach(to: self)
    model.active = controller?.parent != nil
  }
  public func reset() {
    model.active = false; model.onChange = nil; model.onDetentChange = nil; model.onLayout = nil; model.onPanelLayout = nil
    controller?.presentedViewController?.dismiss(animated: false)
    controller?.detach(); controller = nil; model = OneNativeAdaptivePanelModel()
  }
}
