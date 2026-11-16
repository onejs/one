extension NSObject {
  func safeValue(forKey key: String) -> Any? {
    return _safeValue(forKey: key)
  }
}
