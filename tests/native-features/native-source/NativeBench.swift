import SwiftUI

// a large array prop with one changed row; onApplied reports the update tick
// once SwiftUI has taken the new rows, so javascript can time the round trip.
struct BenchRow: Codable {
  var id: Int
  var title: String
  var value: Double
  var flag: Bool
}

public struct BenchList: View {
  let rows: [BenchRow]
  let tick: Int
  let onApplied: (Int) -> Void

  public var body: some View {
    List(rows, id: \.id) { row in
      HStack {
        Text(row.title)
        Spacer()
        Text(String(format: "%.1f", row.value)).foregroundStyle(.secondary)
        if row.flag { Image(systemName: "checkmark") }
      }
    }
    .onChange(of: tick) { _, next in onApplied(next) }
  }
}
