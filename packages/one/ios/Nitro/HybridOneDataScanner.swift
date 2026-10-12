import NitroModules
import UIKit
import Vision
import VisionKit

final class HybridOneDataScanner: HybridOneDataScannerSpec {
  private var controller: DataScannerViewController?
  private var configuration: DataScannerConfiguration?
  private var region: DataScannerRect?
  private var requestedZoom: Double?
  private let presentation = OneUIKitPresentation()
  private lazy var delegate = oneUIKitOnMain {
    let value = OneDataScannerDelegate()
    value.owner = self
    return value
  }
  private var streams: [Double: Task<Void, Never>] = [:]
  private var streamID: Double = 0
  fileprivate var didZoom: (() -> Void)?
  fileprivate var didTap: ((DataScannerRecognizedItem) -> Void)?
  fileprivate var didAdd: (([DataScannerRecognizedItem], [DataScannerRecognizedItem]) -> Void)?
  fileprivate var didUpdate: (([DataScannerRecognizedItem], [DataScannerRecognizedItem]) -> Void)?
  fileprivate var didRemove: (([DataScannerRecognizedItem], [DataScannerRecognizedItem]) -> Void)?
  fileprivate var becameUnavailable: ((DataScannerScanningUnavailable) -> Void)?
  override init() {
    super.init()
    presentation.onDismiss = { [weak self] in oneUIKitOnMain { self?.controller?.stopScanning() } }
  }
  deinit { for task in streams.values { task.cancel() } }
  var isSupported: Bool { oneUIKitOnMain { DataScannerViewController.isSupported } }
  var isAvailable: Bool { oneUIKitOnMain { DataScannerViewController.isAvailable } }
  var supportedTextRecognitionLanguages: [String] { oneUIKitOnMain { DataScannerViewController.supportedTextRecognitionLanguages } }
  func configure(configuration: DataScannerConfiguration) throws {
    try oneUIKitOnMain {
      guard self.configuration == nil else { throw oneNativeError("E_DATA_SCANNER_CONFIGURED", "Scanner initializer is immutable") }
      self.configuration = configuration
    }
  }
  func setDelegate(didZoom: @escaping () -> Void, didTapOn: @escaping (DataScannerRecognizedItem) -> Void,
    didAdd: @escaping ([DataScannerRecognizedItem], [DataScannerRecognizedItem]) -> Void,
    didUpdate: @escaping ([DataScannerRecognizedItem], [DataScannerRecognizedItem]) -> Void,
    didRemove: @escaping ([DataScannerRecognizedItem], [DataScannerRecognizedItem]) -> Void,
    becameUnavailable: @escaping (DataScannerScanningUnavailable) -> Void) throws {
    oneUIKitOnMain {
      self.didZoom = didZoom; self.didTap = didTapOn; self.didAdd = didAdd
      self.didUpdate = didUpdate; self.didRemove = didRemove; self.becameUnavailable = becameUnavailable
    }
  }
  @MainActor private func checkAvailability() throws {
    guard DataScannerViewController.isSupported else { throw oneNativeError("E_DATA_SCANNER_UNSUPPORTED", "unsupported") }
    guard DataScannerViewController.isAvailable else { throw oneNativeError("E_DATA_SCANNER_CAMERA_RESTRICTED", "cameraRestricted") }
    guard let usage = Bundle.main.object(forInfoDictionaryKey: "NSCameraUsageDescription") as? String,
      !usage.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
      throw oneNativeError("E_DATA_SCANNER_MANIFEST", "Set ios.infoPlist.NSCameraUsageDescription")
    }
  }
  @MainActor private func scanner() throws -> DataScannerViewController {
    if let controller { return controller }
    try checkAvailability()
    guard let configuration else { throw oneNativeError("E_DATA_SCANNER_CONFIGURATION", "Initialize recognizedDataTypes first") }
    let types = configuration.recognizedDataTypes.map { value -> DataScannerViewController.RecognizedDataType in
      switch value.type {
      case .text: return .text(languages: value.languages ?? [], textContentType: value.textContentType.map(Self.textContentType))
      case .barcode: return .barcode(symbologies: (value.symbologies ?? []).map { VNBarcodeSymbology(rawValue: $0) })
      }
    }
    let quality: DataScannerViewController.QualityLevel
    switch configuration.qualityLevel { case .balanced: quality = .balanced; case .fast: quality = .fast; case .accurate: quality = .accurate }
    let result = DataScannerViewController(recognizedDataTypes: Set(types), qualityLevel: quality,
      recognizesMultipleItems: configuration.recognizesMultipleItems,
      isHighFrameRateTrackingEnabled: configuration.isHighFrameRateTrackingEnabled,
      isPinchToZoomEnabled: configuration.isPinchToZoomEnabled,
      isGuidanceEnabled: configuration.isGuidanceEnabled, isHighlightingEnabled: configuration.isHighlightingEnabled)
    result.delegate = delegate
    result.regionOfInterest = region.map(Self.rect)
    if let requestedZoom { result.zoomFactor = requestedZoom }
    controller = result
    return result
  }
  private static func textContentType(_ value: DataScannerTextContentType) -> DataScannerViewController.TextContentType {
    switch value {
    case .datetimeduration: return .dateTimeDuration
    case .emailaddress: return .emailAddress
    case .flightnumber: return .flightNumber
    case .fullstreetaddress: return .fullStreetAddress
    case .shipmenttrackingnumber: return .shipmentTrackingNumber
    case .telephonenumber: return .telephoneNumber
    case .url: return .URL
    case .currency: return .currency
    }
  }
  private static func rect(_ value: DataScannerRect) -> CGRect { CGRect(x: value.x, y: value.y, width: value.width, height: value.height) }
  var regionOfInterest: DataScannerRect? {
    get { oneUIKitOnMain { region } }
    set { oneUIKitOnMain { region = newValue; controller?.regionOfInterest = newValue.map(Self.rect) } }
  }
  var isScanning: Bool { oneUIKitOnMain { controller?.isScanning ?? false } }
  func getMinZoomFactor() throws -> Double { try oneUIKitOnMain { try scanner().minZoomFactor } }
  func getMaxZoomFactor() throws -> Double { try oneUIKitOnMain { try scanner().maxZoomFactor } }
  var zoomFactor: Double {
    get { oneUIKitOnMain { controller?.zoomFactor ?? requestedZoom ?? 1 } }
    set { oneUIKitOnMain { requestedZoom = newValue; controller?.zoomFactor = newValue } }
  }
  func startScanning() throws {
    try oneUIKitOnMain {
      try checkAvailability()
      do { try scanner().startScanning() }
      catch DataScannerViewController.ScanningUnavailable.unsupported { throw oneNativeError("E_DATA_SCANNER_UNSUPPORTED", "unsupported") }
      catch DataScannerViewController.ScanningUnavailable.cameraRestricted { throw oneNativeError("E_DATA_SCANNER_CAMERA_RESTRICTED", "cameraRestricted") }
    }
  }
  func stopScanning() throws { oneUIKitOnMain { controller?.stopScanning() } }
  func present(animated: Bool) throws -> Promise<Void> {
    let promise = Promise<Void>()
    DispatchQueue.main.async {
      do {
        try self.checkAvailability()
        try self.presentation.present(self.scanner(), owner: self, animated: animated)
          .then { promise.resolve(withResult: ()) }.catch { promise.reject(withError: $0) }
      } catch { promise.reject(withError: error) }
    }
    return promise
  }
  func dismiss(animated: Bool) throws -> Promise<Void> {
    try oneUIKitOnMain { controller?.stopScanning(); return try presentation.dismiss(animated: animated) }
  }
  func capturePhoto() throws -> Promise<any HybridDocumentCameraImageSpec> {
    let promise = Promise<any HybridDocumentCameraImageSpec>()
    Task { @MainActor in
      do { try self.checkAvailability(); let image = try await self.scanner().capturePhoto(); promise.resolve(withResult: HybridDocumentCameraImage(image)) }
      catch { promise.reject(withError: error) }
    }
    return promise
  }
  func subscribeRecognizedItems(onItems: @escaping ([DataScannerRecognizedItem]) -> Void, onEnd: @escaping () -> Void) throws -> Double {
    try oneUIKitOnMain {
      let scanner = try scanner()
      streamID += 1
      let id = streamID
      streams[id] = Task { @MainActor [weak self] in
        for await items in scanner.recognizedItems {
          if Task.isCancelled { break }
          onItems(items.map(Self.item))
        }
        self?.streams.removeValue(forKey: id)
        onEnd()
      }
      return id
    }
  }
  func unsubscribeRecognizedItems(id: Double) throws { oneUIKitOnMain { streams.removeValue(forKey: id)?.cancel() } }
  fileprivate static func item(_ value: RecognizedItem) -> DataScannerRecognizedItem {
    let bounds = value.bounds
    func point(_ value: CGPoint) -> DataScannerPoint { DataScannerPoint(x: value.x, y: value.y) }
    let mapped = DataScannerBounds(topLeft: point(bounds.topLeft), topRight: point(bounds.topRight), bottomRight: point(bounds.bottomRight), bottomLeft: point(bounds.bottomLeft))
    switch value {
    case .text(let text): return DataScannerRecognizedItem(type: .text, id: text.id.uuidString, bounds: mapped, transcript: text.transcript, payloadStringValue: nil)
    case .barcode(let barcode): return DataScannerRecognizedItem(type: .barcode, id: barcode.id.uuidString, bounds: mapped, transcript: nil, payloadStringValue: barcode.payloadStringValue)
    @unknown default: fatalError("unknown RecognizedItem")
    }
  }
}
final class OneDataScannerDelegate: NSObject, DataScannerViewControllerDelegate {
  weak var owner: HybridOneDataScanner?
  func dataScannerDidZoom(_ dataScanner: DataScannerViewController) { owner?.didZoom?() }
  func dataScanner(_ dataScanner: DataScannerViewController, didTapOn item: RecognizedItem) { owner?.didTap?(HybridOneDataScanner.item(item)) }
  func dataScanner(_ dataScanner: DataScannerViewController, didAdd items: [RecognizedItem], allItems: [RecognizedItem]) { owner?.didAdd?(items.map(HybridOneDataScanner.item), allItems.map(HybridOneDataScanner.item)) }
  func dataScanner(_ dataScanner: DataScannerViewController, didUpdate items: [RecognizedItem], allItems: [RecognizedItem]) { owner?.didUpdate?(items.map(HybridOneDataScanner.item), allItems.map(HybridOneDataScanner.item)) }
  func dataScanner(_ dataScanner: DataScannerViewController, didRemove items: [RecognizedItem], allItems: [RecognizedItem]) { owner?.didRemove?(items.map(HybridOneDataScanner.item), allItems.map(HybridOneDataScanner.item)) }
  func dataScanner(_ dataScanner: DataScannerViewController, becameUnavailableWithError error: DataScannerViewController.ScanningUnavailable) {
    switch error { case .unsupported: owner?.becameUnavailable?(.unsupported); case .cameraRestricted: owner?.becameUnavailable?(.camerarestricted); @unknown default: break }
  }
}
