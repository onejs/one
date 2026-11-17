import NitroModules
import UIKit

// dismiss the controller and its children, including any permission alert.
func oneUIKitDismiss(_ controller: UIViewController, animated: Bool, completion: @escaping () -> Void) {
  guard let presenter = controller.presentingViewController else {
    completion()
    return
  }
  presenter.dismiss(animated: animated, completion: completion)
}

func oneUIKitOnMain<T>(_ work: @MainActor () throws -> T) rethrows -> T {
  if Thread.isMainThread { return try MainActor.assumeIsolated { try work() } }
  return try DispatchQueue.main.sync { try MainActor.assumeIsolated { try work() } }
}

// holds the hybrid owner while UIKit owns its presented controller.
final class OneUIKitPresentation: NSObject, UIAdaptivePresentationControllerDelegate {
  private var controller: UIViewController?
  private var owner: AnyObject?
  private var transitioning = false
  var onDismiss: (() -> Void)?

  func present(_ viewController: UIViewController, owner: AnyObject, animated: Bool) throws -> Promise<Void> {
    precondition(Thread.isMainThread)
    let promise = Promise<Void>()
    guard controller == nil, !transitioning else {
      throw oneNativeError("E_UIKIT_PRESENTED", "Controller is already presented")
    }
    guard let presenter = oneNativePresentingViewController() else {
      throw oneNativeError("E_UIKIT_PRESENTER", "No active view controller can present")
    }
    controller = viewController
    self.owner = owner
    transitioning = true
    presenter.present(viewController, animated: animated) {
      self.transitioning = false
      viewController.presentationController?.delegate = self
      promise.resolve(withResult: ())
    }
    return promise
  }

  func dismiss(animated: Bool) throws -> Promise<Void> {
    precondition(Thread.isMainThread)
    let promise = Promise<Void>()
    guard let controller else { promise.resolve(withResult: ()); return promise }
    guard !transitioning else {
      throw oneNativeError("E_UIKIT_TRANSITION", "Controller transition is in progress")
    }
    transitioning = true
    oneUIKitDismiss(controller, animated: animated) {
      self.clear()
      promise.resolve(withResult: ())
    }
    return promise
  }

  private func clear() {
    controller = nil
    owner = nil
    transitioning = false
  }

  func presentationControllerDidDismiss(_ presentationController: UIPresentationController) {
    let callback = onDismiss
    clear()
    callback?()
  }
}
