@MainActor final class AudioMath: RNXModule {
  init() {}

  func rms(_ samples: [Double]) -> Double {
    let meanSquare = samples.reduce(0.0) { $0 + $1 * $1 } / Double(samples.count)
    return meanSquare.squareRoot()
  }

  func label(name: String) throws -> String {
    if name.isEmpty { throw NSError(domain: "Audio", code: 1) }
    return "swift:\(name)"
  }
}
import Foundation
import SwiftUI
