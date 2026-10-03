import CoreGraphics
import Foundation
import NitroModules
import UIKit

final class HybridOnePrint: HybridOnePrintSpec {
  private static var pending: Promise<PrintResult>?

  func isAvailable() throws -> Promise<Bool> {
    let promise = Promise<Bool>()
    DispatchQueue.main.async {
      promise.resolve(withResult: UIPrintInteractionController.isPrintingAvailable)
    }
    return promise
  }

  func printPdf(fileUri: String, jobName: String?) throws -> Promise<PrintResult> {
    let promise = Promise<PrintResult>()
    DispatchQueue.main.async {
      guard Self.pending == nil else {
        promise.reject(withError: Self.error("E_PRINT_BUSY", "a print sheet is already open"))
        return
      }
      if let jobName, jobName.isEmpty {
        promise.reject(withError: Self.error("E_PRINT_INPUT", "jobName must be non-empty"))
        return
      }
      guard UIPrintInteractionController.isPrintingAvailable else {
        promise.reject(withError: Self.error("E_PRINT_UNAVAILABLE", "printing is unavailable"))
        return
      }
      guard let url = URL(string: fileUri), url.isFileURL,
        url.host == nil || url.host == "" || url.host == "localhost",
        url.query == nil, url.fragment == nil else {
        promise.reject(withError: Self.error("E_PRINT_URI", "a local file:// URI is required"))
        return
      }
      var isDirectory: ObjCBool = false
      guard FileManager.default.fileExists(atPath: url.path, isDirectory: &isDirectory),
        !isDirectory.boolValue else {
        promise.reject(withError: Self.error("E_PRINT_FILE", "PDF file does not exist"))
        return
      }
      guard let document = CGPDFDocument(url as CFURL), document.numberOfPages > 0 else {
        promise.reject(withError: Self.error("E_PRINT_PDF", "file is not a nonempty PDF"))
        return
      }
      guard oneNativePresentingViewController() != nil else {
        promise.reject(withError: Self.error("E_PRINT_PRESENTATION", "no active view controller"))
        return
      }
      let controller = UIPrintInteractionController.shared
      let info = UIPrintInfo(dictionary: nil)
      info.outputType = .general
      info.jobName = jobName ?? url.deletingPathExtension().lastPathComponent
      controller.printInfo = info
      controller.printingItem = url
      Self.pending = promise
      let presented = controller.present(animated: true) { _, completed, error in
        DispatchQueue.main.async {
          guard let pending = Self.pending else { return }
          Self.pending = nil
          controller.printingItem = nil
          if let error {
            pending.reject(withError: Self.error("E_PRINT_FAILED", error.localizedDescription))
          } else {
            pending.resolve(withResult: PrintResult(completed: completed))
          }
        }
      }
      if !presented, let pending = Self.pending {
        Self.pending = nil
        controller.printingItem = nil
        pending.reject(withError: Self.error("E_PRINT_PRESENTATION", "system print sheet did not open"))
      }
    }
    return promise
  }

  private static func error(_ code: String, _ message: String) -> Error {
    oneNativeError(code, "Print.printPdf: \(message)")
  }
}
