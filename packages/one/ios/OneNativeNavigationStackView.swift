import SwiftUI
import UIKit

// a container that owns a bar: a Toolbar publishes its entries here, and this view is
// what rebuilds the bar when they change.
public protocol OneNativeToolbarHost: OneNativeCompositionParent {
  func toolbarChanged()
}

final class OneNativeNavigationStackModel: ObservableObject {
  @Published var content: UIView?
  @Published var toolbarEntries: [OneNativeToolbarEntry] = []
  @Published var swiftStyle = OneNativeStyle()
  var onLayout: ((CGRect) -> Void)?
  var onSDKEvent: ((String, String) -> Void)?
  var active = false

  func emitSDKEvent(_ name: String, _ value: String) {
    if active { onSDKEvent?(name, value) }
  }
}

private struct OneNativeNavigationStackRoot: View {
  @ObservedObject var model: OneNativeNavigationStackModel
  weak var host: OneNativeNavigationStackView?

  var body: some View {
    NavigationStack {
      content
    }
  }

  // the stack's own style and its toolbar attach to the root content. navigationTitle and
  // every other navigation modifier are read from inside the stack, so they sit on what
  // the stack presents rather than on the stack itself.
  private var content: some View {
    Group {
      if let view = model.content {
        OneNativeSlot(
          content: view, mode: .fill, layoutHost: host,
          onLayout: { frame in model.onLayout?(frame) }
        )
        .frame(maxWidth: .infinity, maxHeight: .infinity)
      } else {
        Color.clear
      }
    }
    .oneNativeStyle(model.swiftStyle, emit: model.emitSDKEvent)
    .toolbar {
      ForEach(model.toolbarEntries) { entry in
        OneNativeToolbarEntryContent(entry: entry)
      }
    }
  }
}

// Swift.NavigationStack: a real SwiftUI NavigationStack whose root is the React Native
// content, with the navigation bar filled by the Toolbar markers beside that content.
@objcMembers
public final class OneNativeNavigationStackView: UIView, OneNativeToolbarHost {
  public var onSDKEvent: ((String, String) -> Void)?
  private var model = OneNativeNavigationStackModel()
  private var controller: OneNativeHostingController<OneNativeNavigationStackRoot>?
  private var toolbars: [OneNativeToolbarView] = []
  private var active = false

  // the stack is the root of its own hosted tree, so it is active exactly while that
  // controller is attached, and a toolbar inherits that state the way a composed child
  // inherits its parent's.
  public var compositionActive: Bool { active }

  private func setActive(_ next: Bool) {
    guard active != next else { return }
    active = next
    for toolbar in toolbars { toolbar.propagateActive(next) }
  }

  public override init(frame: CGRect) {
    super.init(frame: frame)
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) is unavailable") }

  public func mountContent(_ view: UIView, onLayout: @escaping (CGRect) -> Void) {
    model.onLayout = onLayout
    model.content = view
  }

  public func unmountContent(_ view: UIView) {
    model.onLayout = nil
    if model.content === view { model.content = nil }
    view.removeFromSuperview()
  }

  public func mountToolbar(_ toolbar: OneNativeToolbarView) {
    toolbars.append(toolbar)
    toolbar.composeInto(self)
    publishToolbars()
  }

  public func unmountToolbar(_ toolbar: OneNativeToolbarView) {
    toolbars.removeAll { $0 === toolbar }
    toolbar.decompose()
    publishToolbars()
  }

  public func toolbarChanged() { publishToolbars() }

  private func publishToolbars() {
    model.toolbarEntries = toolbars.flatMap(\.entries)
  }

  public func configureStyle(_ style: [String: Any]) {
    let next = OneNativeStyle(dictionary: style)
    if model.swiftStyle != next { model.swiftStyle = next }
  }

  public override func didMoveToWindow() { super.didMoveToWindow(); updateHost() }
  public override func layoutSubviews() { super.layoutSubviews(); updateHost() }

  private func updateHost() {
    model.active = false
    guard window != nil else {
      controller?.detach()
      setActive(false)
      return
    }
    if controller == nil {
      model.onSDKEvent = { [weak self] name, value in self?.onSDKEvent?(name, value) }
      controller = OneNativeHostingController(
        rootView: OneNativeNavigationStackRoot(model: model, host: self), screenInsets: true)
    }
    controller?.attach(to: self)
    let attached = controller?.isAttached == true
    model.active = attached
    setActive(attached)
  }

  public func reset() {
    model.active = false
    model.onSDKEvent = nil
    model.onLayout = nil
    setActive(false)
    for toolbar in toolbars { toolbar.decompose() }
    toolbars.removeAll()
    controller?.detach()
    controller = nil
    model = OneNativeNavigationStackModel()
  }
}
