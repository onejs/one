final class KeyboardViewLocator {
  static let shared = KeyboardViewLocator()
  private weak var cachedKeyboardView: UIView?
  private var cachedWindowsCount: Int = 0

  func resolve() -> UIView? {
    let currentWindowsCount = UIApplication.shared.windows.count

    if cachedKeyboardView == nil || currentWindowsCount != cachedWindowsCount {
      cachedKeyboardView = KeyboardView.find()
      cachedWindowsCount = currentWindowsCount
    }

    return cachedKeyboardView
  }
}
