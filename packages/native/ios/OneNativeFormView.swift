import SwiftUI
import UIKit

private final class FormModel: ObservableObject {
  @Published var sizing = "fill"
  var onHeight: ((CGFloat) -> Void)?
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
    })
    .oneNativeMeasured(standalone && model.sizing == "content", model.onHeight)
  }
}

// fill takes the box it is given like before; content hugs the rows SwiftUI measured
// so a form embedded in a sheet wraps its content instead of filling the screen.
@objcMembers
public final class OneNativeFormView: OneNativeContainerView {
  public var onMeasure: ((CGFloat) -> Void)?
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
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) is unavailable") }

  public func configure(sizing: String) {
    if model.sizing != sizing { model.sizing = sizing }
  }

  public func configureEnvironment(
    colorScheme: String, dynamicTypeSize: String, locale: String, tint: UIColor?,
    isEnabled: String
  ) {
    environment.configure(
      colorScheme: colorScheme, dynamicTypeSize: dynamicTypeSize, locale: locale,
      tint: tint, isEnabled: isEnabled)
  }

  public override func reset() {
    environment.reset()
    super.reset()
  }
}
