import NitroModules

// nitro carries only a message across jsi, so a coded failure travels as
// "<code>: <message>" and the js entries split the stable code back out.
func oneNativeError(_ code: String, _ message: String) -> RuntimeError {
  return .error(withMessage: "\(code): \(message)")
}
