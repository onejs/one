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
    if view.content !== content {
      // a recycled react view can already sit in another slot, so only release
      // the previous content while this slot still holds it.
      if view.content.superview === view { view.content.removeFromSuperview() }
      view.content = content
    }
    view.mode = mode
    view.layoutHost = layoutHost
    view.onLayout = onLayout
    view.isUserInteractionEnabled = mode != .passive
    view.accessibilityElementsHidden = mode == .passive
    view.claimContent()
    view.setNeedsLayout()
  }
  func sizeThatFits(_ proposal: ProposedViewSize, uiView: Container, context: Context) -> CGSize? {
    CGSize(width: proposal.width ?? UIView.noIntrinsicMetric, height: proposal.height ?? UIView.noIntrinsicMetric)
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
      claimContent()
    }
    required init?(coder: NSCoder) { fatalError("init(coder:) is unavailable") }

    // swiftUI can update a slot it is about to tear down after its replacement
    // has mounted, as when fabric recycles a host whose old graph is still alive.
    // an off-screen slot therefore takes content only when no on-screen slot
    // holds it, or the teardown would leave the content with no superview.
    func claimContent() {
      guard content.superview !== self else { return }
      guard window != nil || content.window == nil else { return }
      addSubview(content)
    }

    override func didMoveToWindow() {
      super.didMoveToWindow()
      guard window != nil else { return }
      claimContent()
      // a layout pass that ran before the slot had a window skipped sizing.
      setNeedsLayout()
    }

    override func layoutSubviews() {
      super.layoutSubviews()
      guard mode != .passive, window != nil, bounds.width > 0, bounds.height > 0 else { return }
      if mode == .presented { onLayout?(CGRect(origin: .zero, size: bounds.size)) }
      else if let layoutHost, let hostWindow = layoutHost.window, let myWindow = window {
        let frame: CGRect
        if myWindow === hostWindow {
          frame = convert(bounds, to: layoutHost)
        } else {
          let inMyWindow = convert(bounds, to: myWindow)
          let inHostWindow = myWindow.convert(inMyWindow, to: hostWindow)
          frame = layoutHost.convert(inHostWindow, from: hostWindow)
        }
        onLayout?(frame)
      }
      content.frame = bounds
    }
  }
}
