import SwiftUI
import UIKit

private struct FormContent: View {
  @ObservedObject var children: OneNativeChildren
  @ObservedObject var environment: OneNativeEnvironmentModel

  var body: some View {
    OneNativeEnvironment(model: environment, content: Form {
      ForEach(children.items) { child in child.content }
    })
  }
}

// a Form is height-greedy in both modes, so it fills whatever box it is given rather
// than reporting a height the way a host does.
@objcMembers
public final class OneNativeFormView: OneNativeContainerView {
  private let environment: OneNativeEnvironmentModel

  public init() {
    let environment = OneNativeEnvironmentModel()
    self.environment = environment
    super.init(wrap: { children, _ in
      AnyView(FormContent(children: children, environment: environment))
    })
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) is unavailable") }

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
