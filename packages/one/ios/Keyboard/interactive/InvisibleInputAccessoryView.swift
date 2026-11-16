import Foundation
import UIKit

public class InvisibleInputAccessoryView: UIView {
  var isShown = true

  override init(frame: CGRect) {
    super.init(frame: frame)
    setupView()
  }

  public convenience init(height: CGFloat) {
    self.init(frame: CGRect(x: 0, y: 0, width: 0, height: height))
  }

  required init?(coder aDecoder: NSCoder) {
    super.init(coder: aDecoder)
    setupView()
  }

  override public func point(inside _: CGPoint, with _: UIEvent?) -> Bool {
    // Return false to allow touch events to pass through
    return false
  }

  public func updateHeight(to newHeight: CGFloat) {
    frame = CGRect(x: 0, y: 0, width: 0, height: newHeight)

    // Invalidate intrinsic content size to trigger a layout update
    invalidateIntrinsicContentSize()
    layoutIfNeeded()
  }

  public func hide() {
    guard isShown else { return }
    isShown = false
    updateHeight(to: 0.0)
    superview?.layoutIfNeeded()
  }

  override public var intrinsicContentSize: CGSize {
    return CGSize(width: UIView.noIntrinsicMetric, height: frame.height)
  }

  private func setupView() {
    isUserInteractionEnabled = false
    // for debug purposes
    // backgroundColor = UIColor.red.withAlphaComponent(0.2)
    backgroundColor = .clear
    autoresizingMask = .flexibleHeight
  }
}
