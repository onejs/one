import Foundation

// test transport only; filesystem operations run in the production class.
public final class Promise<T> {
  private let condition = NSCondition()
  private var result: Result<T, Error>?
  public init() {}
  public func resolve(withResult value: T) { settle(.success(value)) }
  public func reject(withError error: Error) { settle(.failure(error)) }
  private func settle(_ value: Result<T, Error>) {
    condition.lock()
    result = value
    condition.broadcast()
    condition.unlock()
  }
  public func wait() throws -> T {
    condition.lock()
    defer { condition.unlock() }
    let deadline = Date().addingTimeInterval(5)
    while result == nil {
      guard condition.wait(until: deadline) else { throw RuntimeError.error(withMessage: "promise did not settle") }
    }
    return try result!.get()
  }
}

extension Promise where T == Void {
  public func resolve() { resolve(withResult: ()) }
}

public enum RuntimeError: Error {
  case error(withMessage: String)
}
