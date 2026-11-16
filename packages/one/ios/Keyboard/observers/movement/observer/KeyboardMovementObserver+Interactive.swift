extension KeyboardMovementObserver {
  func setupKVObserver() {
    guard interactiveKeyboardObserver == nil, let view = keyboardTrackingView.view else { return }

    interactiveKeyboardObserver = view.observe(\.center, options: .new) { [weak self] _, change in
      guard let self = self, let changeValue = change.newValue else { return }

      self.keyboardDidMoveInteractively(changeValue: changeValue)
    }
  }

  func removeKVObserver() {
    interactiveKeyboardObserver?.invalidate()
    interactiveKeyboardObserver = nil
  }

  private func keyboardDidMoveInteractively(changeValue: CGPoint) {
    if UIResponder.isKeyboardPreloading {
      return
    }
    // if we are currently animating keyboard -> we need to ignore values from KVO
    if !displayLink.isPaused {
      return
    }

    if KeyboardEventsIgnorer.shared.shouldIgnore {
      return
    }

    let position = keyboardTrackingView.interactive(point: changeValue)

    if position == KeyboardTrackingView.invalidPosition {
      return
    }

    if position == 0 {
      // it will be triggered before `keyboardWillDisappear` and
      // we don't need to trigger `onInteractive` handler for that
      // since it will be handled in `keyboardWillDisappear` function
      return
    }

    prevKeyboardPosition = position

    keyboardDidTask?.cancel()

    onEvent(
      "onKeyboardMoveInteractive",
      position as NSNumber,
      position / CGFloat(keyboardHeight) as NSNumber,
      -1,
      tag
    )
  }
}
