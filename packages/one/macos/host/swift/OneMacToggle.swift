import AppKit
import SwiftUI

// The SwiftUI side of the OneMacToggle Fabric component. The core library finds
// this class by name, so it lives in the app target and the library carries no
// Swift.
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

  @objc var label: String {
    get { model.label }
    set { model.label = newValue }
  }

  @objc var isOn: Bool {
    get { model.isOn }
    set { model.isOn = newValue }
  }

  @objc var onChange: ((Bool) -> Void)? {
    get { model.onChange }
    set { model.onChange = newValue }
  }

  override init(frame frameRect: NSRect) {
    hosting = NSHostingView(rootView: OneMacToggleView(model: model))
    super.init(frame: frameRect)
    hosting.frame = bounds
    hosting.autoresizingMask = [.width, .height]
    addSubview(hosting)
  }

  required init?(coder: NSCoder) {
    fatalError("init(coder:) is not supported")
  }
}
