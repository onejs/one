extension Notification {
  func keyboardMetaData() -> (Int, NSValue?) {
    let duration = Int(
      (userInfo?[UIResponder.keyboardAnimationDurationUserInfoKey] as? Double ?? 0) * 1000
    )
    let keyboardFrame = userInfo?[UIResponder.keyboardFrameEndUserInfoKey] as? NSValue

    return (duration, keyboardFrame)
  }
}

extension Notification.Name {
  static let shouldIgnoreKeyboardEvents = Notification.Name("shouldIgnoreKeyboardEvents")
  static let keyboardDidAppear = Notification.Name("keyboardDidAppear")
}
