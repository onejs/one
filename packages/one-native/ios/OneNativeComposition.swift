import SwiftUI
import UIKit

// a composed control renders inside its parent's hosting controller instead of owning
// one, so it never joins the view hierarchy and never gets a window. it activates on
// publication instead. the parent measures from SwiftUI, so a model change reaches the
// parent's height through SwiftUI's own update pass and needs no notification here.
public protocol OneNativeCompositionParent: AnyObject {}

public protocol OneNativeComposable: UIView {
  func compositionContent() -> AnyView
  func composeInto(_ parent: OneNativeCompositionParent)
  func decompose()
}

// standalone, a control fills the Fabric view it was given. composed, it must take its
// ideal size so the host can measure a stack of them, so the fill lives here rather than
// inside the generated content.
struct OneNativeStandalone<Content: View>: View {
  let content: Content
  var body: some View {
    content.frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
  }
}

// Fabric gives insertion order, not keys, so identity is the child view itself: a
// reorder keeps it and a remount replaces it, which is what SwiftUI wants.
struct OneNativeComposedChild: Identifiable {
  let id: ObjectIdentifier
  let content: AnyView
}
