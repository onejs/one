// the owning model publishes this value; props acknowledge or reset native interactions.
struct OneNativeControlled<Value: Equatable>: Equatable {
  private(set) var value: Value
  private(set) var eventCount = 0
  private(set) var revision = 0

  init(_ value: Value) { self.value = value }

  func applying(_ value: Value, acknowledged: Int, revision: Int) -> Self? {
    var next = self
    if revision != self.revision {
      next.revision = revision
      next.eventCount = 0
      next.value = value
    } else if acknowledged >= eventCount {
      next.value = value
    }
    return next == self ? nil : next
  }

  @discardableResult
  mutating func change(_ value: Value) -> Bool {
    guard value != self.value else { return false }
    eventCount += 1
    self.value = value
    return true
  }

  // a write arriving through a bound sync state: the value converges without
  // counting a native interaction, so no event echoes back to JavaScript.
  @discardableResult
  mutating func adopt(_ value: Value) -> Bool {
    guard value != self.value else { return false }
    self.value = value
    return true
  }
}
