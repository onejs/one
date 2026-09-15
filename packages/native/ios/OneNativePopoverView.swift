import SwiftUI
import UIKit

// the trigger composes like any other container's children; the body is a presented
// slot, as a sheet's is. the generated root in ios/Generated puts the two together.
final class OneNativePopoverModel: ObservableObject {
  @Published var controlled = OneNativeControlled(false)
  @Published var content: UIView?
  @Published var contentWidth: Double = 0
  @Published var contentHeight: Double = 0
  @Published var arrowEdge = ""
  @Published var presentationCompactAdaptation = ""
  var active = false
  var onChange: ((Bool, Int, Int) -> Void)?
  var onLayout: ((CGRect) -> Void)?
  var onHeight: ((CGFloat) -> Void)?
  func change(_ value: Bool) {
    guard active, controlled.value != value else { return }
    controlled.change(value)
    onChange?(value, controlled.eventCount, controlled.revision)
  }
}

@objcMembers
public final class OneNativePopoverView: OneNativeContainerView {
  public var onChange: ((Bool, Int, Int) -> Void)?
  public var onMeasure: ((CGFloat) -> Void)?
  private let model: OneNativePopoverModel

  public init() {
    let model = OneNativePopoverModel()
    self.model = model
    super.init(wrap: { children, standalone in
      AnyView(OneNativePopoverRoot(model: model, children: children, standalone: standalone))
    })
    model.onChange = { [weak self] value, count, revision in
      self?.onChange?(value, count, revision)
    }
    model.onHeight = { [weak self] height in self?.onMeasure?(height) }
  }

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

  public func configure(
    _ isPresented: Bool, acknowledgedEvent: Int, revision: Int, contentWidth: Double,
    contentHeight: Double, arrowEdge: String, presentationCompactAdaptation: String
  ) {
    if let next = model.controlled.applying(
      isPresented, acknowledged: acknowledgedEvent, revision: revision)
    {
      model.controlled = next
    }
    if model.contentWidth != contentWidth { model.contentWidth = contentWidth }
    if model.contentHeight != contentHeight { model.contentHeight = contentHeight }
    if model.arrowEdge != arrowEdge { model.arrowEdge = arrowEdge }
    if model.presentationCompactAdaptation != presentationCompactAdaptation {
      model.presentationCompactAdaptation = presentationCompactAdaptation
    }
  }

  public override func setActive(_ active: Bool) { model.active = active }

  public override func reset() {
    // the model outlives a recycle, because the SwiftUI tree captured it at init, so
    // its presentation state is cleared here rather than by replacing it.
    model.active = false
    model.controlled = OneNativeControlled(false)
    model.content?.removeFromSuperview()
    model.content = nil
    model.onLayout = nil
    super.reset()
  }
}
