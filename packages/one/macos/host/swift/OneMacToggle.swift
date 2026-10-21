import AppKit
import SwiftUI

// The SwiftUI side of the OneMacToggle Fabric component. The core library finds
// this class by name, so it lives in the app target and the library carries no
// Swift. The controlled round trip is OneNativeControlled, the same struct iOS
// uses (packages/one/ios/OneNativeControlled.swift, compiled into this target).
final class OneMacToggleModel: ObservableObject {
  @Published var label = ""
  @Published var isOn = false
  var onChange: ((Bool) -> Void)?
}

private struct OneMacToggleView: View {
  @ObservedObject var model: OneMacToggleModel

  var body: some View {
    Toggle(
      model.label,
      isOn: Binding(
        get: { model.isOn },
        set: { value in
          model.isOn = value
          model.onChange?(value)
        }
      )
    )
    .toggleStyle(.switch)
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
  }
}

@objc(OneMacToggleHostView)
final class OneMacToggleHostView: NSView, OneMacosToggleHosting {
  private let model = OneMacToggleModel()
  private let hosting: NSHostingView<OneMacToggleView>

  private var controlled = OneNativeControlled(false)

  @objc var label: String {
    get { model.label }
    set { model.label = newValue }
  }

  // native applies a user toggle at once and reports it with the event count;
  // props win again only once React acknowledges the latest event
  @objc var onChange: ((Bool, Int, Int) -> Void)?

  @objc(applyValue:acknowledged:revision:)
  func applyValue(_ isOn: Bool, acknowledged: Int, revision: Int) {
    guard let next = controlled.applying(isOn, acknowledged: acknowledged, revision: revision) else { return }
    controlled = next
    model.isOn = next.value
  }

  override init(frame frameRect: NSRect) {
    hosting = NSHostingView(rootView: OneMacToggleView(model: model))
    super.init(frame: frameRect)
    model.onChange = { [weak self] value in
      guard let self, self.controlled.change(value) else { return }
      self.onChange?(value, self.controlled.eventCount, self.controlled.revision)
    }
    hosting.frame = bounds
    hosting.autoresizingMask = [.width, .height]
    addSubview(hosting)
  }

  required init?(coder: NSCoder) {
    fatalError("init(coder:) is not supported")
  }
}
