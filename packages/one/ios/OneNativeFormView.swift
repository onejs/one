import SwiftUI
import UIKit

private final class FormModel: ObservableObject {
  @Published var sizing = "fill"
  @Published var swiftStyle = OneNativeStyle()
  var active = false
  var onHeight: ((CGFloat) -> Void)?
  var onSDKEvent: ((String, String) -> Void)?
  func emitSDKEvent(_ name: String, _ value: String) {
    if active { onSDKEvent?(name, value) }
  }
}

private struct FormContent: View {
  @ObservedObject var model: FormModel
  @ObservedObject var children: OneNativeChildren
  @ObservedObject var environment: OneNativeEnvironmentModel
  // composed, the parent lays this form out and measures it; only a standalone
  // content-sized form answers to Yoga.
  let standalone: Bool

  var body: some View {
    OneNativeEnvironment(model: environment, content: Form {
      ForEach(children.items) { child in child.content }
    }.oneNativeStyle(model.swiftStyle, emit: model.emitSDKEvent))
    .oneNativeMeasured(standalone && model.sizing == "content", model.onHeight)
  }
}

// fill takes the box it is given like before; content hugs the rows SwiftUI measured
// so a form embedded in a sheet wraps its content instead of filling the screen.
@objcMembers
public final class OneNativeFormView: OneNativeContainerView {
  public var onMeasure: ((CGFloat) -> Void)?
  public var onSDKEvent: ((String, String) -> Void)?
  private let model: FormModel
  private let environment: OneNativeEnvironmentModel

  public init() {
    let model = FormModel()
    let environment = OneNativeEnvironmentModel()
    self.model = model
    self.environment = environment
    super.init(wrap: { children, standalone in
      AnyView(FormContent(model: model, children: children, environment: environment, standalone: standalone))
    })
    model.onHeight = { [weak self] height in self?.onMeasure?(height) }
    model.onSDKEvent = { [weak self] name, value in self?.onSDKEvent?(name, value) }
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) is unavailable") }

  public func configure(sizing: String) {
    if model.sizing != sizing { model.sizing = sizing }
  }

  public func configureStyle(_ style: [String: Any]) {
    let next = OneNativeStyle(dictionary: style)
    if model.swiftStyle != next { model.swiftStyle = next }
  }

  public override func setActive(_ active: Bool) { model.active = active }

  public func configureEnvironment(
    colorScheme: String, dynamicTypeSize: String, controlSize: String, locale: String,
    tint: UIColor?, isEnabled: String
  ) {
    environment.configure(
      colorScheme: colorScheme, dynamicTypeSize: dynamicTypeSize, controlSize: controlSize,
      locale: locale, tint: tint, isEnabled: isEnabled)
  }

  public override func reset() {
    environment.reset()
    model.swiftStyle = OneNativeStyle()
    super.reset()
  }
}
