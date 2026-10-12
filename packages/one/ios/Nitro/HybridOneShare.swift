import NitroModules
import React
import UIKit

final class HybridOneShare: HybridOneShareSpec {
  private enum Problem: LocalizedError {
    case emptyItems
    case emptyText
    case invalidURL
    case missingFile
    case busy
    case presentation

    var errorDescription: String? {
      switch self {
      case .emptyItems: return "at least one item is required"
      case .emptyText: return "text cannot be empty"
      case .invalidURL: return "the item needs an absolute URL of its declared type"
      case .missingFile: return "the file does not exist or is a directory"
      case .busy: return "a share sheet is already open"
      case .presentation: return "there is no active view controller to present from"
      }
    }
  }

  private var pending: Promise<ShareResult>?
  private var activeController: UIActivityViewController?

  func share(items: [ShareItem]) throws -> Promise<ShareResult> {
    let promise = Promise<ShareResult>()
    DispatchQueue.main.async {
      guard self.pending == nil else {
        promise.reject(withError: Self.failure(.busy))
        return
      }
      let values: [Any]
      do {
        values = try Self.values(items)
      } catch let error as Problem {
        promise.reject(withError: Self.failure(error))
        return
      } catch {
        promise.reject(withError: oneNativeError("E_SHARE_FAILED", "Share.share: \(error.localizedDescription)"))
        return
      }
      guard UIApplication.shared.applicationState == .active,
        let presenter = Self.topViewController(), presenter.view.window != nil,
        !presenter.isBeingDismissed, !presenter.isBeingPresented,
        presenter.transitionCoordinator == nil
      else {
        promise.reject(withError: Self.failure(.presentation))
        return
      }
      let controller = UIActivityViewController(activityItems: values, applicationActivities: nil)
      if let popover = controller.popoverPresentationController {
        popover.sourceView = presenter.view
        let bounds = presenter.view.bounds
        popover.sourceRect = CGRect(x: bounds.midX, y: bounds.midY, width: 1, height: 1)
      }
      self.pending = promise
      self.activeController = controller
      controller.completionWithItemsHandler = { [weak self, weak controller] activityType, completed, _, error in
        DispatchQueue.main.async {
          guard let self, let pending = self.pending else { return }
          if !completed, activityType != nil, controller?.presentingViewController != nil {
            return
          }
          self.pending = nil
          self.activeController = nil
          if let error {
            pending.reject(withError: oneNativeError("E_SHARE_FAILED", "Share.share: \(error.localizedDescription)"))
          } else {
            pending.resolve(withResult: ShareResult(
              completed: completed, activityType: activityType?.rawValue))
          }
        }
      }
      presenter.present(controller, animated: true)
      DispatchQueue.main.asyncAfter(deadline: .now() + 1) { [weak self, weak controller] in
        guard let self, let controller, self.activeController === controller,
          controller.presentingViewController == nil, let pending = self.pending
        else { return }
        self.pending = nil
        self.activeController = nil
        pending.reject(withError: Self.failure(.presentation))
      }
    }
    return promise
  }

  private static func values(_ items: [ShareItem]) throws -> [Any] {
    guard !items.isEmpty else { throw Problem.emptyItems }
    return try items.map { item in
      switch item.type {
      case .text:
        guard !item.value.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
          throw Problem.emptyText
        }
        return item.value
      case .url:
        guard let url = URL(string: item.value), url.scheme != nil, !url.isFileURL else {
          throw Problem.invalidURL
        }
        return url
      case .file:
        guard let url = URL(string: item.value), url.isFileURL,
          url.host == nil || url.host == "" || url.host == "localhost",
          url.query == nil, url.fragment == nil
        else { throw Problem.invalidURL }
        var directory: ObjCBool = false
        guard FileManager.default.fileExists(atPath: url.path, isDirectory: &directory),
          !directory.boolValue
        else { throw Problem.missingFile }
        return url.standardizedFileURL
      }
    }
  }

  private static func topViewController() -> UIViewController? {
    var top = RCTKeyWindow()?.rootViewController
    while let presented = top?.presentedViewController { top = presented }
    return top
  }

  private static func failure(_ error: Problem) -> RuntimeError {
    let code: String
    switch error {
    case .emptyItems, .emptyText: code = "E_SHARE_ITEMS"
    case .invalidURL: code = "E_SHARE_URL"
    case .missingFile: code = "E_SHARE_FILE"
    case .busy: code = "E_SHARE_BUSY"
    case .presentation: code = "E_SHARE_PRESENTATION"
    }
    return oneNativeError(code, "Share.share: \(error.localizedDescription)")
  }
}
