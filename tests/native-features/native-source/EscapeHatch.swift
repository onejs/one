struct Waypoint: Codable {
  var x: Double
  var y: Double
  var label: String? = nil
}

enum Compass: String, Codable {
  case north
  case south
}

@MainActor final class EscapeHatch: PeachModule {
  init() {}

  func pin(_ point: Waypoint) -> Waypoint { point }
  func heading(_ direction: Compass) -> Compass { direction }
  func at(_ when: Date) -> Date { when }
  func blob(_ data: Data) -> Data { data }

  private var tick: ((Double) -> Void)?
  func onTick(_ callback: @escaping (Double) -> Void) {
    tick = callback
    Task {
      try? await Task.sleep(nanoseconds: 100_000_000)
      tick?(1.0)
    }
  }
}
