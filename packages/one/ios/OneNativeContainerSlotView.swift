import SwiftUI
import UIKit

private final class SlotModel: ObservableObject {
  @Published var height: Double = 0
  // zero fills the width the container offers; a horizontal stack offers none, so a
  // slot in one takes an explicit width.
  @Published var width: Double = 0
  // the React Native subtree lives in the Fabric component view, which is the view
  // SwiftUI displays. the slot view itself is never shown.
  weak var content: UIView?
  var onLayout: ((CGRect) -> Void)?
}

private struct SlotContent: View {
  @ObservedObject var model: SlotModel

  var body: some View {
    if let content = model.content {
      // the origin is local, as it is for presented sheet content: SwiftUI places the
      // slot, and a composed container has no view in the window to measure against.
      let slot = OneNativeSlot(
        content: content, mode: .presented, layoutHost: nil,
        onLayout: { frame in model.onLayout?(frame) }
      )
      if model.width > 0 {
        slot.frame(width: model.width, height: model.height)
      } else {
        slot.frame(maxWidth: .infinity, minHeight: model.height, maxHeight: model.height)
      }
    }
  }
}

@objcMembers
public final class OneNativeContainerSlotView: UIView, OneNativeComposable {
  private let model = SlotModel()

  public var content: UIView? {
    get { model.content }
    set { model.content = newValue }
  }

  public var onLayout: ((CGRect) -> Void)? {
    get { model.onLayout }
    set { model.onLayout = newValue }
  }

  public func configure(height: Double, width: Double) {
    if model.height != height { model.height = height }
    if model.width != width { model.width = width }
  }

  public func compositionContent() -> AnyView { AnyView(SlotContent(model: model)) }

  // SwiftUI proposes the box, so publication tells the slot nothing it needs.
  public func composeInto(_ parent: OneNativeCompositionParent) {}

  // React Native recycles the slot's view in the same transaction that unmounts it, and
  // asserts it has no superview. SwiftUI dismantles the representable later, so the view
  // has to leave the SwiftUI tree here.
  public func decompose() { model.content?.removeFromSuperview() }

  public func reset() {
    model.content?.removeFromSuperview()
    model.height = 0
    model.width = 0
  }
}
