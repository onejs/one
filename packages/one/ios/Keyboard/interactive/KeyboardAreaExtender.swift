class KeyboardAreaExtender: NSObject {
  private var currentInputAccessoryView: InvisibleInputAccessoryView?

  @objc static let shared = KeyboardAreaExtender()

  override private init() {
    super.init()
    NotificationCenter.default.addObserver(
      self,
      selector: #selector(keyboardDidAppear),
      name: .keyboardDidAppear,
      object: nil
    )
  }

  deinit {
    NotificationCenter.default.removeObserver(self)
  }

  var offset: CGFloat {
    return currentInputAccessoryView?.frame.height ?? 0
  }

  func hide() {
    if isVisible {
      NotificationCenter.default.post(
        name: .shouldIgnoreKeyboardEvents, object: nil, userInfo: ["ignore": true]
      )
      currentInputAccessoryView?.hide()
    }
  }

  func remove() {
    currentInputAccessoryView = nil
  }

  func updateHeight(to newHeight: CGFloat, for nativeID: String) {
    if UIResponder.current.nativeID == nativeID {
      currentInputAccessoryView?.updateHeight(to: newHeight)
    }
  }

  private var isVisible: Bool {
    return currentInputAccessoryView?.isShown ?? false
  }

  @objc private func keyboardDidAppear(_: Notification) {
    let responder = UIResponder.current
    if let activeTextInput = responder as? TextInput,
       let offset = KeyboardOffsetProvider.shared.getOffset(
         forTextInputNativeID: responder.nativeID
       ),
       responder?.inputAccessoryView == nil
    {
      currentInputAccessoryView = InvisibleInputAccessoryView(height: CGFloat(truncating: offset))

      // we need to send this event before we actually attach the IAV
      // since on some OS versions (iOS 15 for example), `reloadInputViews`
      // will trigger `keyboardDidAppear` listener immediately
      NotificationCenter.default.post(
        name: .shouldIgnoreKeyboardEvents, object: nil, userInfo: ["ignore": true]
      )

      activeTextInput.inputAccessoryView = currentInputAccessoryView
      activeTextInput.reloadInputViews()
    }
  }
}
