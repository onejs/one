import SwiftUI
import UIKit

// a divider renders nothing of its own and holds nothing, so it is only ever published
// into a container's SwiftUI tree. React Native rejects one outside a container, which is
// why there is no hosting controller here to fall back on.
@objcMembers
public final class OneNativeDividerView: UIView, OneNativeComposable {
  public func compositionContent() -> AnyView { AnyView(Divider()) }

  public func composeInto(_ parent: OneNativeCompositionParent) {}

  public func decompose() {}

  public func reset() {}
}
