extension KeyboardMovementObserver {
  @objc func keyboardWillAppear(_ notification: Notification) {
    guard !UIResponder.isKeyboardPreloading else { return }

    let (duration, frame) = notification.keyboardMetaData()
    if let keyboardFrame = frame {
      tag = UIResponder.current.reactViewTag
      let keyboardHeight = keyboardFrame.cgRectValue.size.height
      self.keyboardHeight = keyboardHeight
      self.notification = notification

      guard !KeyboardEventsIgnorer.shared.shouldIgnore else {
        KeyboardEventsIgnorer.shared.shouldIgnoreKeyboardEvents = false
        return
      }

      self.duration = duration

      // foldable devices can emit `keyboardWillShow` with a `0` keyboard height when the device is rotated
      let progress: NSNumber = self.keyboardHeight > 0 ? 1 : 0

      onRequestAnimation()
      onEvent("onKeyboardMoveStart", Float(self.keyboardHeight) as NSNumber, progress, duration as NSNumber, tag)
      onNotify("KeyboardController::keyboardWillShow", buildEventParams(self.keyboardHeight, duration, tag))

      setupKeyboardWatcher()
      initializeAnimation(fromValue: prevKeyboardPosition, toValue: self.keyboardHeight)
      scheduleDidEvent(height: self.keyboardHeight, duration: animation?.duration ?? CGFloat(duration) / 1000)
    }
  }

  @objc func keyboardWillDisappear(_ notification: Notification) {
    guard !UIResponder.isKeyboardPreloading else { return }
    // once the keyboard hides, the `keyboardWillShow` that `KeyboardAreaExtender` armed the flag
    // for can't arrive anymore, so the next show is a real one and must not be swallowed
    KeyboardEventsIgnorer.shared.shouldIgnoreKeyboardEvents = false
    let (duration, _) = notification.keyboardMetaData()
    tag = UIResponder.current.reactViewTag
    self.notification = notification
    // when keyboard disappears immediately replace the keyboard frame with .zero
    // since this will be the final frame of the keyboard after animation
    self.notification?.userInfo?[UIResponder.keyboardFrameEndUserInfoKey] =
      NSValue(cgRect: CGRect(x: 0, y: 0, width: 0, height: 0))
    self.duration = duration

    onRequestAnimation()
    onEvent("onKeyboardMoveStart", 0, 0, duration as NSNumber, tag)
    onNotify("KeyboardController::keyboardWillHide", buildEventParams(0, duration, tag))

    setupKeyboardWatcher()
    removeKVObserver()
    initializeAnimation(fromValue: prevKeyboardPosition, toValue: 0)
    scheduleDidEvent(height: 0, duration: animation?.duration ?? CGFloat(duration) / 1000)
  }

  @objc func keyboardDidAppear(_ notification: Notification) {
    guard !UIResponder.isKeyboardPreloading else { return }

    let (duration, frame) = notification.keyboardMetaData()
    if let keyboardFrame = frame {
      let keyboardHeight = keyboardFrame.cgRectValue.size.height
      tag = UIResponder.current.reactViewTag
      self.keyboardHeight = keyboardHeight

      let height = self.keyboardHeight
      // always limit progress to the maximum possible value
      let progress = min(height / self.keyboardHeight, 1.0)

      onCancelAnimation()
      onEvent("onKeyboardMoveEnd", height as NSNumber, progress as NSNumber, duration as NSNumber, tag)
      onNotify("KeyboardController::keyboardDidShow", buildEventParams(height, duration, tag))

      removeKeyboardWatcher()
      setupKVObserver()
      animation = nil

      NotificationCenter.default.post(
        name: .keyboardDidAppear, object: notification, userInfo: nil
      )
    }
  }

  @objc func keyboardDidDisappear(_ notification: Notification) {
    guard !UIResponder.isKeyboardPreloading else { return }
    let (duration, _) = notification.keyboardMetaData()
    tag = UIResponder.current.reactViewTag

    onCancelAnimation()
    onEvent("onKeyboardMoveEnd", 0 as NSNumber, 0, duration as NSNumber, tag)
    onNotify("KeyboardController::keyboardDidHide", buildEventParams(0, duration, tag))

    removeKeyboardWatcher()
    prevKeyboardPosition = 0
    animation = nil
  }

  @objc func scheduleDidEvent(height: CGFloat, duration: CGFloat) {
    keyboardDidTask?.cancel()

    guard let notification = notification else {
      return
    }

    let task = DispatchWorkItem { [weak self] in
      guard let self = self else { return }
      if height > 0 {
        self.keyboardDidAppear(notification)
      } else {
        self.keyboardDidDisappear(notification)
      }
    }

    keyboardDidTask = task
    DispatchQueue.main.asyncAfter(deadline: .now() + duration, execute: task)
  }
}
