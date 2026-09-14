import SwiftUI
import UIKit

private final class SpacerModel: ObservableObject {
  @Published var minLength: Double = 0
}

private struct SpacerContent: View {
  @ObservedObject var model: SpacerModel

  var body: some View {
    Spacer(minLength: model.minLength)
  }
}

// a spacer renders nothing of its own and holds nothing, so it is only ever published
// into a container's SwiftUI tree. React Native rejects one outside a container, which is
// why there is no hosting controller here to fall back on.
@objcMembers
public final class OneNativeSpacerView: UIView, OneNativeComposable {
  private let model = SpacerModel()

  public func configure(minLength: Double) {
    if model.minLength != minLength { model.minLength = minLength }
  }

  public func compositionContent() -> AnyView { AnyView(SpacerContent(model: model)) }

  // a spacer takes the space its parent stack offers, so publication tells it nothing.
  public func composeInto(_ parent: OneNativeCompositionParent) {}

  public func decompose() {}

  public func reset() { model.minLength = 0 }
}
