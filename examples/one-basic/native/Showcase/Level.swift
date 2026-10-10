import SwiftUI

// the package's @main view is this file's default export:
// `<Level value={0.4} />` arrives here as json props.
@main struct Level: RNXPackage {
  func view(props: JSON) -> some View {
    let value = props["value"]?.doubleValue ?? 0
    return Gauge(value: value) {
      Text("Level")
    } currentValueLabel: {
      Text(value, format: .percent.precision(.fractionLength(0)))
    }
    .gaugeStyle(.accessoryCircularCapacity)
    .tint(.orange)
    .padding()
  }
}
