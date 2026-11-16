extension KeyboardMovementObserver {
  @objc func setupKeyboardWatcher() {
    // sometimes `will` events can be called multiple times.
    // To avoid double re-creation of listener we are adding this condition
    // (if active link is present, then no need to re-setup a listener)
    if !displayLink.isPaused {
      return
    }

    displayLink.isPaused = false
  }

  @objc func removeKeyboardWatcher() {
    displayLink.isPaused = true
  }

  @objc func updateKeyboardFrame(link: CADisplayLink) {
    if keyboardTrackingView.view == nil {
      return
    }

    let (visibleKeyboardHeight, keyboardFrameY) = keyboardTrackingView.view.frameTransitionInWindow
    var keyboardPosition = visibleKeyboardHeight - KeyboardAreaExtender.shared.offset

    if keyboardPosition == prevKeyboardPosition || keyboardFrameY == 0 {
      return
    }

    if animation == nil {
      initializeAnimation(fromValue: prevKeyboardPosition, toValue: keyboardHeight)
    }

    prevKeyboardPosition = keyboardPosition

    if let animation = animation {
      if animation.isFinished {
        return
      }
      let baseDuration = animation.timingAt(value: keyboardPosition)

      #if targetEnvironment(simulator)
        // on iOS simulator we can not use static interval
        // (from my observation from frame to frame we may have different delays)
        // so for now we use approximation - we add a difference as
        // beginTime - keyboardEventTime (but only in 0..0.016 range)
        // and it gives satisfactory results (better than static delays)
        let duration = baseDuration + animation.diff
      #else
        // 2 frames because we read previous frame, but need to calculate the next frame
        let duration = baseDuration + link.duration * 2
      #endif

      let position = CGFloat(animation.valueAt(time: duration))
      // handles a case when final frame has final destination (i. e. 0 or 291)
      // but CASpringAnimation can never get to this final destination
      let race: (CGFloat, CGFloat) -> CGFloat = animation.isIncreasing ? max : min
      keyboardPosition = race(position, keyboardPosition)
      animation.lastValue = keyboardPosition
    }

    onEvent(
      "onKeyboardMove",
      keyboardPosition as NSNumber,
      keyboardPosition / CGFloat(keyboardHeight) as NSNumber,
      duration as NSNumber,
      tag
    )
  }
}
