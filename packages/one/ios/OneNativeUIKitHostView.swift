import SwiftUI
import UIKit

// one host for every public UIKit view and view controller. javascript builds the view
// through the generated SDK bindings (`await UICalendarView.init()` from one/ios/UIKit),
// sets its properties and delegates there, and hands the handle to Swift.UIKitView.
// this host only places it: standalone it fills the box React Native gives it, composed
// in a One container it sits in SwiftUI as a representable. a new SDK view therefore
// needs no host of its own.

// a view javascript registered for mounting. the javascript handle keeps the object
// alive; the registry holds it weakly, and a mounted host holds it strongly.
enum OneNativeUIKitRegistry {
  private static let lock = NSLock()
  nonisolated(unsafe) private static var next = 0
  nonisolated(unsafe) private static let objects = NSMapTable<NSNumber, NSObject>.strongToWeakObjects()

  static func register(_ object: NSObject) -> Int {
    lock.lock()
    defer { lock.unlock() }
    next += 1
    objects.setObject(object, forKey: NSNumber(value: next))
    return next
  }

  static func object(_ id: Int) -> NSObject? {
    lock.lock()
    defer { lock.unlock() }
    return objects.object(forKey: NSNumber(value: id))
  }
}

private final class OneNativeUIKitHostModel: ObservableObject {
  @Published var hosted: NSObject?
  @Published var accessibility = OneNativeAccessibility()
}

private struct OneNativeUIKitViewRepresentable: UIViewRepresentable {
  let view: UIView
  func makeUIView(context: Context) -> UIView { view }
  func updateUIView(_ uiView: UIView, context: Context) {}
}

private struct OneNativeUIKitControllerRepresentable: UIViewControllerRepresentable {
  let controller: UIViewController
  func makeUIViewController(context: Context) -> UIViewController { controller }
  func updateUIViewController(_ controller: UIViewController, context: Context) {}
}

private struct OneNativeUIKitContent: View {
  @ObservedObject var model: OneNativeUIKitHostModel
  var body: some View {
    Group {
      if let controller = model.hosted as? UIViewController {
        OneNativeUIKitControllerRepresentable(controller: controller)
          .id(ObjectIdentifier(controller))
      } else if let view = model.hosted as? UIView {
        OneNativeUIKitViewRepresentable(view: view)
          .id(ObjectIdentifier(view))
      }
    }
    .oneNativeAccessibility(model.accessibility, containsChildren: true)
  }
}

@objcMembers
public final class OneNativeUIKitHostView: UIView, OneNativeComposable {
  private let model = OneNativeUIKitHostModel()
  private var composed = false

  public func configureAccessibility(_ label: String, hint: String, value: String, identifier: String) {
    let next = OneNativeAccessibility(label: label, hint: hint, value: value, identifier: identifier)
    if model.accessibility != next { model.accessibility = next }
  }

  public func configure(viewId: Double) {
    let next = viewId > 0 ? OneNativeUIKitRegistry.object(Int(viewId)) : nil
    if viewId > 0 && next == nil {
      preconditionFailure("Swift.UIKitView view \(Int(viewId)) was released before it mounted")
    }
    guard next !== model.hosted else { return }
    detach()
    model.hosted = next
    attach()
  }

  private var hostedView: UIView? {
    (model.hosted as? UIView) ?? (model.hosted as? UIViewController)?.view
  }

  // standalone, the view fills this box and a controller joins the nearest controller
  private func attach() {
    guard !composed, window != nil, let view = hostedView, view.superview !== self else { return }
    if let controller = model.hosted as? UIViewController, controller.parent == nil, let parent = parentController {
      parent.addChild(controller)
      mount(view)
      controller.didMove(toParent: parent)
    } else {
      mount(view)
    }
  }

  private func mount(_ view: UIView) {
    view.translatesAutoresizingMaskIntoConstraints = true
    view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    view.frame = bounds
    addSubview(view)
  }

  private func detach() {
    guard let view = hostedView, view.superview === self else { return }
    if let controller = model.hosted as? UIViewController, controller.parent != nil {
      controller.willMove(toParent: nil)
      view.removeFromSuperview()
      controller.removeFromParent()
    } else {
      view.removeFromSuperview()
    }
  }

  private var parentController: UIViewController? {
    var responder: UIResponder? = next
    while let current = responder {
      if let controller = current as? UIViewController { return controller }
      responder = current.next
    }
    return nil
  }

  public override func didMoveToWindow() {
    super.didMoveToWindow()
    if window == nil { detach() } else { attach() }
  }

  // composed, SwiftUI owns the view through a representable in the parent's host
  public func compositionContent() -> AnyView { AnyView(OneNativeUIKitContent(model: model)) }

  public func composeInto(_ parent: OneNativeCompositionParent) {
    detach()
    composed = true
  }

  public func decompose() {
    composed = false
    attach()
  }

  public func reset() {
    detach()
    model.hosted = nil
    model.accessibility = OneNativeAccessibility()
    composed = false
  }
}
