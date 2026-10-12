import NitroModules
import UIKit

func oneUIKitOnMain<T>(_ work: () throws -> T) rethrows -> T {
  if Thread.isMainThread { return try work() }
  return try DispatchQueue.main.sync(execute: work)
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
    controller.dismiss(animated: animated) {
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
