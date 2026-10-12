// vendored from @sbaiahmed1/react-native-blur@6.0.2 ios/Views/BlurEffectView.swift
// (MIT, Copyright (c) 2025 Ahmed Sbai); the Detox on/off branch is dropped.
// see VENDORING.md.

import UIKit

/// UIVisualEffectView with intensity control. UIVisualEffectView has no
/// intensity API, so a paused animator scrubs the effect in; the animator is
/// rebuilt whenever UIKit could have flushed it.
@objcMembers
public final class OneNativeBlurEffectView: UIVisualEffectView {
  private var animator: UIViewPropertyAnimator?
  private var blurStyle: UIBlurEffect.Style = .regular
  private var blurIntensity: Double = 0
  private var foregroundObserver: NSObjectProtocol?
  private var stabilizationDisplayLink: CADisplayLink?
  private var stabilizationFramesRemaining = 0

  public init() {
    super.init(effect: nil)
    isUserInteractionEnabled = false
    // paused animators do not survive backgrounding: the system finishes them,
    // leaving the effect at full intensity. rebuild before the first foreground
    // frame renders.
    foregroundObserver = NotificationCenter.default.addObserver(
      forName: UIApplication.willEnterForegroundNotification,
      object: nil,
      queue: .main
    ) { [weak self] _ in
      self?.rebuildAnimator()
    }
  }

  required init?(coder: NSCoder) {
    fatalError("init(coder:) is not supported")
  }

  /// `intensity` 0-1; 0 is a sharp passthrough.
  public func updateBlur(style: UIBlurEffect.Style, intensity: Double) {
    blurStyle = style
    blurIntensity = intensity
    rebuildAnimator()
    startStabilizationIfNeeded()
  }

  // UIKit flushes the paused animation whenever an ancestor animates alpha
  // (fade navigation transitions), so rebuild on window entry.
  public override func didMoveToWindow() {
    super.didMoveToWindow()
    if window != nil {
      rebuildAnimator()
      startStabilizationIfNeeded()
      return
    }
    stopStabilization()
  }

  // UIVisualEffectView calls draw(_:) whenever the effect needs to refresh,
  // which heals a flush the hooks above miss (an in-place alpha animation
  // while the view stays in the window and the app stays foreground).
  public override func draw(_ rect: CGRect) {
    super.draw(rect)
    rebuildAnimator()
  }

  private func rebuildAnimator() {
    effect = nil
    animator?.stopAnimation(true)
    animator = nil
    guard blurIntensity > 0 else { return }
    let style = blurStyle
    animator = UIViewPropertyAnimator(duration: 1, curve: .linear) { [weak self] in
      self?.effect = UIBlurEffect(style: style)
    }
    animator?.fractionComplete = CGFloat(blurIntensity)
  }

  // UIKit can still invalidate the paused animator during the first few
  // transition frames after mount; rebuild across a tiny bounded window.
  private func startStabilizationIfNeeded() {
    stopStabilization()
    guard window != nil else { return }
    stabilizationFramesRemaining = 3
    let displayLink = CADisplayLink(target: self, selector: #selector(handleStabilizationTick))
    displayLink.add(to: .main, forMode: .common)
    stabilizationDisplayLink = displayLink
  }

  private func stopStabilization() {
    stabilizationDisplayLink?.invalidate()
    stabilizationDisplayLink = nil
    stabilizationFramesRemaining = 0
  }

  @objc private func handleStabilizationTick() {
    guard window != nil, stabilizationFramesRemaining > 0 else {
      stopStabilization()
      return
    }
    rebuildAnimator()
    stabilizationFramesRemaining -= 1
    if stabilizationFramesRemaining == 0 {
      stopStabilization()
    }
  }

  deinit {
    stopStabilization()
    animator?.stopAnimation(true)
    if let foregroundObserver {
      NotificationCenter.default.removeObserver(foregroundObserver)
    }
  }
}
