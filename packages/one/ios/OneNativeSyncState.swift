import Foundation

// native-owned storage for observable sync state: one entry per useNativeState
// handle, keyed by the id the JS handle carries. SwiftUI models bind by id and
// adopt writes directly, so bound views converge without a React render. the
// JSI host object reads and writes through here from both the JS runtime and
// the UI worklet runtime.
final class OneNativeSyncState: NSObject {
  fileprivate let id: Int32
  fileprivate var value: NSObject
  fileprivate var listeners: [Int: (NSObject) -> Void] = [:]
  fileprivate init(id: Int32, value: NSObject) {
    self.id = id
    self.value = value
  }
}

@objc(OneNativeSyncRegistry)
public final class OneNativeSyncRegistry: NSObject {
  private static var states: [Int32: OneNativeSyncState] = [:]
  private static var nextId: Int32 = 1
  private static var nextToken = 1
  private static let lock = NSLock()

  @objc(create:)
  public static func create(_ initial: NSObject) -> Int32 {
    lock.lock()
    defer { lock.unlock() }
    let id = nextId
    nextId += 1
    states[id] = OneNativeSyncState(id: id, value: initial)
    return id
  }

  @objc(destroy:)
  public static func destroy(_ id: Int32) {
    lock.lock()
    defer { lock.unlock() }
    states.removeValue(forKey: id)
  }

  @objc(get:)
  public static func get(_ id: Int32) -> NSObject? {
    lock.lock()
    defer { lock.unlock() }
    return states[id]?.value
  }

  // writes the batching thread makes between beginBatch and endBatch store
  // their value at once but notify only when the batch ends, so withAnimation
  // can apply them all inside one SwiftUI transaction.
  private static var batchThread: Thread?
  private static var batched: [Int32] = []

  static func beginBatch() {
    lock.lock()
    defer { lock.unlock() }
    precondition(batchThread == nil, "OneNativeSyncRegistry batches cannot nest")
    batchThread = Thread.current
  }

  static func endBatch() -> [Int32] {
    lock.lock()
    defer { lock.unlock() }
    let ids = batched
    batched = []
    batchThread = nil
    return ids
  }

  // main thread only: notifies every listener of each entry's current value.
  // listeners are copied under the lock and invoked outside it: a listener may
  // set or observe reentrantly.
  static func notify(_ ids: [Int32]) {
    for id in ids {
      lock.lock()
      guard let state = states[id] else {
        lock.unlock()
        continue
      }
      let value = state.value
      let listeners = Array(state.listeners.values)
      lock.unlock()
      for listener in listeners {
        listener(value)
      }
    }
  }

  @objc(set:value:)
  public static func set(_ id: Int32, value: NSObject) {
    lock.lock()
    if batchThread === Thread.current {
      if let state = states[id] {
        state.value = value
        if !batched.contains(id) { batched.append(id) }
      }
      lock.unlock()
      return
    }
    lock.unlock()
    // listeners mutate SwiftUI models, so notification always lands on main,
    // synchronously: the writer observes the converged value on return.
    if Thread.isMainThread {
      apply(id, value)
    } else {
      DispatchQueue.main.sync { apply(id, value) }
    }
  }

  @objc(observe:listener:)
  public static func observe(_ id: Int32, listener: @escaping (NSObject) -> Void) -> Int {
    lock.lock()
    defer { lock.unlock() }
    let token = nextToken
    nextToken += 1
    states[id]?.listeners[token] = listener
    return token
  }

  @objc(unobserve:token:)
  public static func unobserve(_ id: Int32, token: Int) {
    lock.lock()
    defer { lock.unlock() }
    states[id]?.listeners.removeValue(forKey: token)
  }

  private static func apply(_ id: Int32, _ value: NSObject) {
    lock.lock()
    guard let state = states[id] else {
      lock.unlock()
      return
    }
    state.value = value
    lock.unlock()
    notify([id])
  }
}
