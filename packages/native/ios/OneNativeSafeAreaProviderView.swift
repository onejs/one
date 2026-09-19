import UIKit

// first-party safe-area provider view. reports its own safeAreaInsets and
// its frame in the parent view controller's coordinates through onInsets,
// following upstream RNCSafeAreaProvider: layout and inset callbacks feed
// one deduped publisher, keyboard notifications invalidate, zero-size
// frames and unchanged values never emit.
@objcMembers
public final class OneNativeSafeAreaProviderView: UIView {
  // reports whether the adapter delivered the reading. values cache only on
  // confirmation, so a first reading that arrives before the Fabric event
  // emitter exists retries on the next trigger instead of sticking at zero.
  public var onInsets:
    ((Double, Double, Double, Double, Double, Double, Double, Double) -> Bool)?

  private var currentInsets = UIEdgeInsets.zero
  private var currentFrame = CGRect.zero
  private var initialInsetsSent = false
  private var registeredNotifications = false

  public override func willMove(toSuperview newSuperview: UIView?) {
    super.willMove(toSuperview: newSuperview)
    if newSuperview != nil && !registeredNotifications {
      registeredNotifications = true
      let center = NotificationCenter.default
      center.addObserver(
        self, selector: #selector(invalidateSafeAreaInsets),
        name: UIResponder.keyboardDidShowNotification, object: nil)
      center.addObserver(
        self, selector: #selector(invalidateSafeAreaInsets),
        name: UIResponder.keyboardDidHideNotification, object: nil)
      center.addObserver(
        self, selector: #selector(invalidateSafeAreaInsets),
        name: UIResponder.keyboardDidChangeFrameNotification, object: nil)
    }
  }

  public override func safeAreaInsetsDidChange() {
    super.safeAreaInsetsDidChange()
    invalidateSafeAreaInsets()
  }

  public override func layoutSubviews() {
    super.layoutSubviews()
    invalidateSafeAreaInsets()
  }

  @objc private func invalidateSafeAreaInsets() {
    guard superview != nil else { return }
    // called before react native sets the view size, so wait rather than
    // publish insets against a zero frame.
    guard bounds.size != .zero else { return }
    let insets = safeAreaInsets
    var responder: UIResponder? = self
    while responder != nil && !(responder is UIViewController) {
      responder = responder?.next
    }
    let frame: CGRect
    if let parent = (responder as? UIViewController)?.view {
      frame = convert(bounds, to: parent)
    } else if let window = window {
      frame = convert(bounds, to: window)
    } else {
      frame = bounds
    }
    let threshold = 1 / (window?.screen.scale ?? 1)
    if initialInsetsSent
      && abs(insets.top - currentInsets.top) < threshold
      && abs(insets.left - currentInsets.left) < threshold
      && abs(insets.bottom - currentInsets.bottom) < threshold
      && abs(insets.right - currentInsets.right) < threshold
      && frame == currentFrame
    {
      return
    }
    let delivered =
      onInsets?(
        insets.top, insets.right, insets.bottom, insets.left,
        frame.origin.x, frame.origin.y, frame.size.width, frame.size.height) ?? false
    if delivered {
      initialInsetsSent = true
      currentInsets = insets
      currentFrame = frame
    }
  }

  public func reset() {
    currentInsets = .zero
    currentFrame = .zero
    initialInsetsSent = false
    NotificationCenter.default.removeObserver(self)
    registeredNotifications = false
  }

  deinit {
    NotificationCenter.default.removeObserver(self)
  }
}
