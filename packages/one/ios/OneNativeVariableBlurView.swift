// vendored from @sbaiahmed1/react-native-blur@6.0.2 ios/Views/VariableBlurView.swift
// (MIT, Copyright (c) 2025 Ahmed Sbai). the filter setup, overlay hiding,
// foreground reapply and window scale sync are upstream's; the mask is
// injected by the owner (OneNativeEdgeFadeComponentView builds it from the
// fade curve) instead of upstream's direction/startOffset gradients. see
// VENDORING.md.

import QuartzCore
import UIKit

/// Variable (gradient) blur backed by the private `CAFilter` `variableBlur`
/// type, which UIKit does not expose publicly. The mask image scales the blur
/// radius per pixel: alpha 1 is `radius`, alpha 0 is sharp.
///
/// RISK (upstream's note): this depends on private Core Animation API, reached
/// by class/selector name and applied with KVC. If the class or keys go away
/// the view keeps its plain backdrop and the gradient silently drops (no
/// crash). If Apple ships a public variable-blur API, migrate to it.
@objcMembers
public final class OneNativeVariableBlurView: UIVisualEffectView {

  private var radius: CGFloat = 0
  private var maskImage: CGImage?
  private var foregroundObserver: NSObjectProtocol?

  public init() {
    super.init(effect: UIBlurEffect(style: .regular))
    isUserInteractionEnabled = false
    // UIKit resets UIVisualEffectView's internal layer configuration when the
    // app returns from the background, wiping the variableBlur filter and
    // restoring the overlay subviews; reapply before the first foreground frame.
    foregroundObserver = NotificationCenter.default.addObserver(
      forName: UIApplication.willEnterForegroundNotification,
      object: nil,
      queue: .main
    ) { [weak self] _ in
      self?.applyFilter()
    }
  }

  required init?(coder: NSCoder) {
    fatalError("init(coder:) is not supported")
  }

  deinit {
    if let foregroundObserver {
      NotificationCenter.default.removeObserver(foregroundObserver)
    }
  }

  /// `mask` alpha runs over the view's bounds (row 0 is the top edge).
  public func update(radius: CGFloat, mask: CGImage) {
    self.radius = radius
    self.maskImage = mask
    applyFilter()
  }

  private func applyFilter() {
    guard let maskImage else { return }
    guard let filterClass = NSClassFromString(String("retliFAC".reversed())) as? NSObject.Type,
      let variableBlur = filterClass.perform(
        NSSelectorFromString(String(":epyThtiWretlif".reversed())),
        with: "variableBlur"
      )?.takeUnretainedValue() as? NSObject
    else { return }

    variableBlur.setValue(radius, forKey: "inputRadius")
    variableBlur.setValue(maskImage, forKey: "inputMaskImage")
    variableBlur.setValue(true, forKey: "inputNormalizeEdges")

    subviews.first?.layer.filters = [variableBlur]
    // the backdrop subview carries the blur; the tint and luminosity overlays
    // would wash it, so hide them.
    for subview in subviews.dropFirst() {
      subview.alpha = 0
    }
  }

  public override func didMoveToWindow() {
    super.didMoveToWindow()
    guard let window, let backdropLayer = subviews.first?.layer else { return }
    // UIKit can strip the filter while detached or mid-transition; reapply on
    // window entry so the view heals itself.
    applyFilter()
    let scale = window.traitCollection.displayScale
    if backdropLayer.value(forKey: "scale") as? CGFloat != scale {
      backdropLayer.setValue(scale, forKey: "scale")
    }
  }
}
