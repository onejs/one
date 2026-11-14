import SwiftUI
import UIKit

final class OneNativeSlotLayoutHost {
  weak var view: UIView?
}

private struct OneNativeSlotLayoutHostKey: EnvironmentKey {
  static let defaultValue: OneNativeSlotLayoutHost? = nil
}

private struct OneNativeSlotScrollingKey: EnvironmentKey {
  static let defaultValue = false
}

extension EnvironmentValues {
  var oneNativeSlotLayoutHost: OneNativeSlotLayoutHost? {
    get { self[OneNativeSlotLayoutHostKey.self] }
    set { self[OneNativeSlotLayoutHostKey.self] = newValue }
  }

  var oneNativeSlotScrolling: Bool {
    get { self[OneNativeSlotScrollingKey.self] }
    set { self[OneNativeSlotScrollingKey.self] = newValue }
  }
}

@available(iOS 18, *)
private struct OneNativeSlotScrollTracking: ViewModifier {
  @Environment(\.oneNativeSlotScrolling) private var ancestorScrolling
  @State private var scrolling = false

  func body(content: Content) -> some View {
    content
      .environment(\.oneNativeSlotScrolling, ancestorScrolling || scrolling)
      .onScrollPhaseChange { _, phase in
        scrolling = phase != .idle
      }
  }
}

extension View {
  @ViewBuilder func oneNativeSlotScrollTracking() -> some View {
    if #available(iOS 18, *) {
      modifier(OneNativeSlotScrollTracking())
    } else {
      self
    }
  }
}

struct OneNativeSlot: UIViewRepresentable {
  @Environment(\.oneNativeSlotScrolling) private var scrolling
  enum Mode { case fill, passive, presented }
  let content: UIView
  let mode: Mode
  weak var layoutHost: UIView?
  var onLayout: ((CGRect) -> Void)?
  var onWindowChange: ((ObjectIdentifier, Bool) -> Void)?
  // the measured React Native content size, when the host reports one. a
  // presented host sizing to its content reads it as the ideal size; zero
  // keeps the proposal, as every other host does.
  var measuredWidth: CGFloat = 0
  var measuredHeight: CGFloat = 0

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
    view.onWindowChange = onWindowChange
    view.scrolling = scrolling
    view.isUserInteractionEnabled = mode != .passive
    view.accessibilityElementsHidden = mode == .passive
    view.claimContent()
    view.setNeedsLayout()
  }
  func sizeThatFits(_ proposal: ProposedViewSize, uiView: Container, context: Context) -> CGSize? {
    CGSize(
      width: measuredWidth > 0 ? measuredWidth : (proposal.width ?? UIView.noIntrinsicMetric),
      height: measuredHeight > 0 ? measuredHeight : (proposal.height ?? UIView.noIntrinsicMetric)
    )
  }
  static func dismantleUIView(_ view: Container, coordinator: ()) {
    view.onLayout = nil
    if view.content.superview === view { view.content.removeFromSuperview() }
  }

  final class Container: UIView {
    var content: UIView {
      didSet { reportedFrame = nil }
    }
    var mode = Mode.passive
    weak var layoutHost: UIView?
    var onLayout: ((CGRect) -> Void)?
    var onWindowChange: ((ObjectIdentifier, Bool) -> Void)?
    var scrolling = false
    private var reportedFrame: CGRect?
    private var hasWindow = false
    init(content: UIView) {
      self.content = content
      super.init(frame: .zero)
      claimContent()
    }
    required init?(coder: NSCoder) { fatalError("init(coder:) is unavailable") }

    // swiftUI can update a slot it is about to tear down after its replacement
    // has mounted, as when fabric recycles a host whose old graph is still alive.
    // hosts hand content to slots and never mount it themselves, so a slot takes
    // content only from nobody or from another slot: content under any other
    // parent is a recycled react view fabric has since mounted elsewhere, often
    // in a subtree still off screen. an off-screen slot takes it from another
    // slot only when that slot is off screen too, or the teardown would leave
    // the content with no superview.
    func claimContent() {
      guard content.superview !== self else { return }
      if let holder = content.superview {
        guard let slot = holder as? Container, window != nil || slot.window == nil else { return }
      }
      addSubview(content)
    }

    override func didMoveToWindow() {
      super.didMoveToWindow()
      let attached = window != nil
      if attached != hasWindow {
        hasWindow = attached
        onWindowChange?(ObjectIdentifier(self), attached)
      }
      guard window != nil else { return }
      claimContent()
      // a layout pass that ran before the slot had a window skipped sizing.
      setNeedsLayout()
    }

    override func layoutSubviews() {
      super.layoutSubviews()
      guard mode != .passive, window != nil, bounds.width > 0, bounds.height > 0 else { return }
      content.frame = bounds
      // scrolling moves existing rows without changing their bounds. publish their
      // new origins once idle, but still size newly materialized lazy rows.
      if scrolling, reportedFrame?.size == bounds.size { return }
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
        reportedFrame = frame
        onLayout?(frame)
      }
    }
  }
}
