enum KeyboardControllerConfiguration {
  static var usesKeyboardLayoutGuideTracking: Bool {
    if #available(iOS 26.0, *) {
      return true
    }

    return false
  }
}
