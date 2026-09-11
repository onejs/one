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

// a container publishes its children into its own SwiftUI tree, so the tree observes
// this rather than the container view.
final class OneNativeChildren: ObservableObject {
  @Published var items: [OneNativeComposedChild] = []
}

// every container composes children the same way and differs only in the SwiftUI
// container it wraps them in, which it supplies at init. a container is composable
// itself, so containers nest.
@objcMembers public class OneNativeContainerView: UIView, OneNativeComposable,
  OneNativeCompositionParent
{
  private let wrap: (OneNativeChildren, Bool) -> AnyView
  private let published = OneNativeChildren()
  private var childViews: [UIView] = []
  private var controller: OneNativeHostingController<AnyView>?
  private weak var compositionParent: OneNativeCompositionParent?

  @nonobjc init(wrap: @escaping (OneNativeChildren, _ standalone: Bool) -> AnyView) {
    self.wrap = wrap
    super.init(frame: .zero)
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) is unavailable") }

  public func insertChild(_ child: UIView, at index: Int) {
    childViews.insert(child, at: min(index, childViews.count))
    (child as? OneNativeComposable)?.composeInto(self)
    publish()
  }

  public func removeChild(_ child: UIView) {
    guard let index = childViews.firstIndex(where: { $0 === child }) else { return }
    childViews.remove(at: index)
    (child as? OneNativeComposable)?.decompose()
    publish()
  }

  private func publish() {
    published.items = childViews.compactMap { view in
      guard let composable = view as? OneNativeComposable else { return nil }
      return OneNativeComposedChild(
        id: ObjectIdentifier(view), content: composable.compositionContent())
    }
  }

  public func compositionContent() -> AnyView { wrap(published, false) }

  public func composeInto(_ parent: OneNativeCompositionParent) {
    controller?.detach()
    controller = nil
    compositionParent = parent
  }

  public func decompose() { compositionParent = nil }

  public override func didMoveToWindow() { super.didMoveToWindow(); updateHost() }
  public override func layoutSubviews() { super.layoutSubviews(); updateHost() }

  private func updateHost() {
    guard compositionParent == nil else { return }
    guard window != nil else { controller?.detach(); return }
    if controller == nil {
      controller = OneNativeHostingController(rootView: wrap(published, true))
    }
    controller?.attach(to: self)
  }

  public func reset() {
    compositionParent = nil
    for child in childViews { (child as? OneNativeComposable)?.decompose() }
    childViews.removeAll()
    published.items = []
    controller?.detach()
    controller = nil
  }
}
