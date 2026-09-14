import SwiftUI
import UIKit

struct OneNativeSlot: UIViewRepresentable {
  enum Mode { case fill, passive, presented }
  let content: UIView
  let mode: Mode
  weak var layoutHost: UIView?
  var onLayout: ((CGRect) -> Void)?

  func makeUIView(context: Context) -> Container { Container(content: content) }
  func updateUIView(_ view: Container, context: Context) {
    if view.content !== content { view.content.removeFromSuperview(); view.content = content }
    if content.superview !== view { view.addSubview(content) }
    view.mode = mode
    view.layoutHost = layoutHost
    view.onLayout = onLayout
    view.isUserInteractionEnabled = mode != .passive
    view.accessibilityElementsHidden = mode == .passive
    view.setNeedsLayout()
  }
  static func dismantleUIView(_ view: Container, coordinator: ()) {
    view.onLayout = nil
    if view.content.superview === view { view.content.removeFromSuperview() }
  }

  final class Container: UIView {
    var content: UIView
    var mode = Mode.passive
    weak var layoutHost: UIView?
    var onLayout: ((CGRect) -> Void)?
    init(content: UIView) {
      self.content = content
      super.init(frame: .zero)
      addSubview(content)
    }
    required init?(coder: NSCoder) { fatalError("init(coder:) is unavailable") }
    override func layoutSubviews() {
      super.layoutSubviews()
      guard mode != .passive, window != nil, bounds.width > 0, bounds.height > 0 else { return }
      if mode == .presented { onLayout?(CGRect(origin: .zero, size: bounds.size)) }
      else if let layoutHost, layoutHost.window != nil { onLayout?(convert(bounds, to: layoutHost)) }
      content.frame = bounds
    }
  }
}
