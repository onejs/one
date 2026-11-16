extension String {
  func hasAnyPrefix(_ prefixes: [String]) -> Bool {
    prefixes.contains { hasPrefix($0) }
  }
}
