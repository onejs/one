import SwiftUI
import UIKit

private struct FormContent: View {
  @ObservedObject var children: OneNativeChildren

  var body: some View {
    Form {
      ForEach(children.items) { child in child.content }
    }
  }
}

// a Form is height-greedy in both modes, so it fills whatever box it is given rather
// than reporting a height the way a host does.
@objcMembers
public final class OneNativeFormView: OneNativeContainerView {
  public init() {
    super.init(wrap: { children, _ in AnyView(FormContent(children: children)) })
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) is unavailable") }
}
