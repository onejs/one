import SwiftUI

// a public view is a named, typed export: its stored properties are the
// component's props, and a closure property is a callback.
// `<Level value={level} onChange={setLevel} />` renders it.
public struct Level: View {
  let value: Double
  let onChange: (Double) -> Void

  public var body: some View {
    HStack(spacing: 16) {
      Gauge(value: value) {
        Text("Level")
      } currentValueLabel: {
        Text(value, format: .percent.precision(.fractionLength(0)))
      }
      .gaugeStyle(.accessoryCircularCapacity)
      Slider(value: Binding(get: { value }, set: onChange))
    }
    .tint(.orange)
    .padding()
  }
}
