import AVFoundation
import UIKit

private final class CameraMetadataDelegate: NSObject, AVCaptureMetadataOutputObjectsDelegate {
  weak var owner: OneNativeCameraView?

  func metadataOutput(
    _ output: AVCaptureMetadataOutput,
    didOutput metadataObjects: [AVMetadataObject],
    from connection: AVCaptureConnection
  ) {
    owner?.handleMetadata(output, metadataObjects: metadataObjects)
  }
}

// one capture in flight; AVCapturePhotoOutput holds its delegate weakly.
private final class CameraPhotoDelegate: NSObject, AVCapturePhotoCaptureDelegate {
  let finish: (AVCapturePhoto?, Error?) -> Void

  init(finish: @escaping (AVCapturePhoto?, Error?) -> Void) {
    self.finish = finish
  }

  func photoOutput(
    _ output: AVCapturePhotoOutput,
    didFinishProcessingPhoto photo: AVCapturePhoto,
    error: Error?
  ) {
    finish(photo, error)
  }
}

@objcMembers public final class OneNativeCameraView: UIView {
  public var onStateChange: ((String) -> Void)?
  public var onCodeScanned: ((String, String) -> Void)?
  // requestId, uri, width, height, base64, error ("" on success).
  public var onPicture: ((Int, String, Int, Int, String, String) -> Void)?

  public override class var layerClass: AnyClass { AVCaptureVideoPreviewLayer.self }

  private static let symbologies: [(name: String, type: AVMetadataObject.ObjectType)] = [
    ("qr", .qr), ("ean13", .ean13), ("ean8", .ean8), ("upce", .upce),
    ("code128", .code128), ("code39", .code39), ("code93", .code93),
    ("pdf417", .pdf417), ("aztec", .aztec), ("dataMatrix", .dataMatrix),
  ]

  private var previewLayer: AVCaptureVideoPreviewLayer {
    layer as! AVCaptureVideoPreviewLayer
  }

  private let sessionQueue = DispatchQueue(label: "dev.one.camera.capture")
  private var session: AVCaptureSession?
  private var metadataOutput: AVCaptureMetadataOutput?
  // owned by sessionQueue.
  private var photoOutput: AVCapturePhotoOutput?
  private var captureDevice: AVCaptureDevice?
  private var photoDelegates: [Int: CameraPhotoDelegate] = [:]
  private let metadataDelegate = CameraMetadataDelegate()
  private var sessionObservers: [NSObjectProtocol] = []
  private var rotationCoordinator: AVCaptureDevice.RotationCoordinator?
  private var rotationObservation: NSKeyValueObservation?
  private var sessionPending = false
  private var sessionReady = false
  private var active = false
  private var facing = "back"
  private var codeTypes: [String] = []
  private var flash = "off"
  private var torch = false
  private var zoom: Double = 0
  private var generation = 0
  private var lastState = ""
  private var activeObserver: NSObjectProtocol?
  private var backgroundObserver: NSObjectProtocol?

  public override init(frame: CGRect) {
    super.init(frame: frame)
    metadataDelegate.owner = self
    clipsToBounds = true
    isAccessibilityElement = true
    accessibilityLabel = "Camera preview"
    previewLayer.videoGravity = .resizeAspectFill
    activeObserver = NotificationCenter.default.addObserver(
      forName: UIApplication.didBecomeActiveNotification, object: nil, queue: .main
    ) { [weak self] _ in self?.refresh() }
    backgroundObserver = NotificationCenter.default.addObserver(
      forName: UIApplication.didEnterBackgroundNotification, object: nil, queue: .main
    ) { [weak self] _ in self?.refresh() }
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) is unavailable") }

  deinit {
    if let activeObserver { NotificationCenter.default.removeObserver(activeObserver) }
    if let backgroundObserver { NotificationCenter.default.removeObserver(backgroundObserver) }
    for observer in sessionObservers { NotificationCenter.default.removeObserver(observer) }
  }

  public override func didMoveToWindow() {
    super.didMoveToWindow()
    refresh()
  }

  public func configure(_ active: Bool, facing: String, codeTypes: [String]) {
    guard self.active != active || self.facing != facing || self.codeTypes != codeTypes else { return }
    self.active = active
    self.facing = facing
    self.codeTypes = codeTypes
    refresh(reconfigure: true)
  }

  // flash, torch and zoom change the running device without restarting the session.
  public func configureCapture(_ flash: String, torch: Bool, zoom: Double) {
    guard self.flash != flash || self.torch != torch || self.zoom != zoom else { return }
    self.flash = flash
    self.torch = torch
    self.zoom = zoom
    sessionQueue.async { self.applyDeviceSettings(torch: torch, zoom: zoom) }
  }

  public func reset() {
    active = false
    facing = "back"
    codeTypes = []
    flash = "off"
    torch = false
    zoom = 0
    refresh()
  }

  private func applyDeviceSettings(torch: Bool, zoom: Double) {
    guard let device = captureDevice, (try? device.lockForConfiguration()) != nil else { return }
    defer { device.unlockForConfiguration() }
    let torchMode: AVCaptureDevice.TorchMode = torch ? .on : .off
    if device.hasTorch, device.isTorchModeSupported(torchMode) { device.torchMode = torchMode }
    let low = device.minAvailableVideoZoomFactor
    let high = device.maxAvailableVideoZoomFactor
    device.videoZoomFactor = low + CGFloat(zoom) * (high - low)
  }

  public func takePicture(_ requestId: Int, quality: Double, base64: Bool) {
    let fail = { [weak self] (code: String, message: String) in
      self?.onPicture?(requestId, "", 0, 0, "", "\(code): \(message)")
    }
    guard sessionReady, let coordinator = rotationCoordinator else {
      let state = lastState.isEmpty ? "waiting" : lastState
      fail("E_CAMERA_NOT_READY", "CameraView is not ready to take a picture (state: \(state))")
      return
    }
    let angle = coordinator.videoRotationAngleForHorizonLevelCapture
    let flashName = flash
    let current = generation
    sessionQueue.async { [weak self] in
      guard let self, let output = self.photoOutput,
        output.availablePhotoCodecTypes.contains(.jpeg)
      else {
        DispatchQueue.main.async { fail("E_CAMERA_NOT_READY", "CameraView has no photo output") }
        return
      }
      let settings = AVCapturePhotoSettings(format: [
        AVVideoCodecKey: AVVideoCodecType.jpeg,
        AVVideoCompressionPropertiesKey: [AVVideoQualityKey: quality],
      ])
      let flashMode: AVCaptureDevice.FlashMode =
        flashName == "on" ? .on : flashName == "auto" ? .auto : .off
      if output.supportedFlashModes.contains(flashMode) { settings.flashMode = flashMode }
      if let connection = output.connection(with: .video),
        connection.isVideoRotationAngleSupported(angle)
      {
        connection.videoRotationAngle = angle
      }
      let delegate = CameraPhotoDelegate { [weak self] photo, error in
        guard let self else { return }
        // photo callbacks arrive on the output's private queue.
        self.sessionQueue.async { self.photoDelegates[requestId] = nil }
        let result = Self.savePicture(photo: photo, error: error, base64: base64)
        DispatchQueue.main.async {
          guard self.generation == current else {
            fail("E_CAMERA_INACTIVE", "CameraView stopped before the picture was taken")
            return
          }
          switch result {
          case .success(let picture):
            self.onPicture?(requestId, picture.uri, picture.width, picture.height, picture.base64, "")
          case .failure(let failure):
            fail("E_CAMERA_CAPTURE", failure.message)
          }
        }
      }
      self.photoDelegates[requestId] = delegate
      output.capturePhoto(with: settings, delegate: delegate)
    }
  }

  private struct SavedPicture {
    let uri: String
    let width: Int
    let height: Int
    let base64: String
  }

  private struct CaptureFailure: Error {
    let message: String
  }

  // writes the jpeg to caches/Camera and reports its displayed size: exif
  // orientations 5 to 8 are rotated a quarter turn, so their sides swap.
  private static func savePicture(
    photo: AVCapturePhoto?, error: Error?, base64: Bool
  ) -> Result<SavedPicture, CaptureFailure> {
    if let error { return .failure(CaptureFailure(message: error.localizedDescription)) }
    guard let data = photo?.fileDataRepresentation(),
      let source = CGImageSourceCreateWithData(data as CFData, nil),
      let properties = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [CFString: Any],
      let pixelWidth = properties[kCGImagePropertyPixelWidth] as? Int,
      let pixelHeight = properties[kCGImagePropertyPixelHeight] as? Int
    else { return .failure(CaptureFailure(message: "The camera returned no image data")) }
    let orientation = properties[kCGImagePropertyOrientation] as? Int ?? 1
    let quarterTurn = (5...8).contains(orientation)
    do {
      let directory = try FileManager.default
        .url(for: .cachesDirectory, in: .userDomainMask, appropriateFor: nil, create: true)
        .appendingPathComponent("Camera", isDirectory: true)
      try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
      let file = directory.appendingPathComponent("\(UUID().uuidString).jpg")
      try data.write(to: file, options: .atomic)
      return .success(SavedPicture(
        uri: file.absoluteString,
        width: quarterTurn ? pixelHeight : pixelWidth,
        height: quarterTurn ? pixelWidth : pixelHeight,
        base64: base64 ? data.base64EncodedString() : ""
      ))
    } catch {
      return .failure(CaptureFailure(message: error.localizedDescription))
    }
  }

  private func emitState(_ state: String) {
    guard lastState != state else { return }
    lastState = state
    accessibilityValue = state
    onStateChange?(state)
  }

  public func replayState() {
    if !lastState.isEmpty { onStateChange?(lastState) }
  }

  private func emitState(_ state: String, generation: Int) {
    DispatchQueue.main.async { [weak self] in
      guard let self, self.generation == generation else { return }
      self.sessionPending = false
      self.emitState(state)
    }
  }

  private func refresh(reconfigure: Bool = false) {
    guard active, window != nil, UIApplication.shared.applicationState == .active else {
      generation += 1
      releaseSession()
      sessionQueue.async {
        self.session?.stopRunning()
        self.session = nil
        self.photoOutput = nil
        self.captureDevice = nil
      }
      emitState("inactive")
      return
    }
    guard AVCaptureDevice.authorizationStatus(for: .video) == .authorized else {
      generation += 1
      releaseSession()
      sessionQueue.async {
        self.session?.stopRunning()
        self.session = nil
        self.photoOutput = nil
        self.captureDevice = nil
      }
      emitState("permission-required")
      return
    }

    if !reconfigure && (sessionReady || sessionPending) { return }
    generation += 1
    let current = generation
    releaseSession()
    sessionPending = true

    let position: AVCaptureDevice.Position = facing == "front" ? .front : .back
    let requestedNames = codeTypes
    sessionQueue.async { [weak self] in
      guard let self else { return }
      self.session?.stopRunning()
      self.session = nil
      self.photoOutput = nil
      self.captureDevice = nil
      guard let device = AVCaptureDevice.default(
        .builtInWideAngleCamera, for: .video, position: position
      ) else {
        self.emitState("unavailable", generation: current)
        return
      }

      let next = AVCaptureSession()
      next.beginConfiguration()
      next.sessionPreset = .high
      do {
        let input = try AVCaptureDeviceInput(device: device)
        guard next.canAddInput(input) else {
          next.commitConfiguration()
          self.emitState("failed", generation: current)
          return
        }
        next.addInput(input)
      } catch {
        next.commitConfiguration()
        self.emitState("failed", generation: current)
        return
      }

      var output: AVCaptureMetadataOutput?
      if !requestedNames.isEmpty {
        let metadata = AVCaptureMetadataOutput()
        guard next.canAddOutput(metadata) else {
          next.commitConfiguration()
          self.emitState("failed", generation: current)
          return
        }
        next.addOutput(metadata)
        metadata.setMetadataObjectsDelegate(self.metadataDelegate, queue: self.sessionQueue)
        output = metadata
      }
      let photo = AVCapturePhotoOutput()
      guard next.canAddOutput(photo) else {
        next.commitConfiguration()
        self.emitState("failed", generation: current)
        return
      }
      next.addOutput(photo)
      next.commitConfiguration()
      self.photoOutput = photo
      self.captureDevice = device

      var readyState = "ready"
      if let output {
        let requested = requestedNames.compactMap { name in
          Self.symbologies.first(where: { $0.name == name })?.type
        }
        let available = Set(output.availableMetadataObjectTypes)
        let enabled = requested.filter { available.contains($0) }
        output.metadataObjectTypes = enabled
        if enabled.isEmpty { readyState = "unsupported" }
      }
      let stateWhenRunning = readyState
      self.session = next
      DispatchQueue.main.async { [weak self] in
        guard let self, self.generation == current else { return }
        self.metadataOutput = output
        self.previewLayer.session = next
        let coordinator = AVCaptureDevice.RotationCoordinator(
          device: device, previewLayer: self.previewLayer
        )
        self.rotationCoordinator = coordinator
        self.rotationObservation = coordinator.observe(
          \.videoRotationAngleForHorizonLevelPreview, options: [.initial, .new]
        ) { [weak self] coordinator, _ in
          guard let connection = self?.previewLayer.connection else { return }
          let angle = coordinator.videoRotationAngleForHorizonLevelPreview
          if connection.isVideoRotationAngleSupported(angle) {
            connection.videoRotationAngle = angle
          }
        }
        self.observeSession(next)
        let queue = self.sessionQueue
        let torch = self.torch
        let zoom = self.zoom
        queue.async { [weak self] in
          next.startRunning()
          self?.applyDeviceSettings(torch: torch, zoom: zoom)
          let running = next.isRunning
          DispatchQueue.main.async { [weak self] in
            guard let self, self.generation == current else { return }
            self.sessionReady = running
            self.sessionPending = false
            self.emitState(running ? stateWhenRunning : "failed")
          }
        }
      }
    }
  }

  private func releaseSession() {
    for observer in sessionObservers { NotificationCenter.default.removeObserver(observer) }
    sessionObservers.removeAll()
    rotationObservation?.invalidate()
    rotationObservation = nil
    rotationCoordinator = nil
    previewLayer.session = nil
    metadataOutput = nil
    sessionPending = false
    sessionReady = false
  }

  private func observeSession(_ currentSession: AVCaptureSession) {
    let center = NotificationCenter.default
    sessionObservers.append(center.addObserver(
      forName: AVCaptureSession.wasInterruptedNotification, object: currentSession, queue: .main
    ) { [weak self] _ in self?.emitState("inactive") })
    sessionObservers.append(center.addObserver(
      forName: AVCaptureSession.interruptionEndedNotification, object: currentSession, queue: .main
    ) { [weak self] _ in self?.refresh(reconfigure: true) })
    sessionObservers.append(center.addObserver(
      forName: AVCaptureSession.runtimeErrorNotification, object: currentSession, queue: .main
    ) { [weak self] notification in
      guard let self else { return }
      let error = notification.userInfo?[AVCaptureSessionErrorKey] as? AVError
      if error?.code == .mediaServicesWereReset {
        self.refresh(reconfigure: true)
      } else {
        self.sessionReady = false
        self.emitState("failed")
      }
    })
  }

  fileprivate func handleMetadata(
    _ output: AVCaptureMetadataOutput,
    metadataObjects: [AVMetadataObject]
  ) {
    let codes = metadataObjects.compactMap { object -> (String, String)? in
      guard let code = object as? AVMetadataMachineReadableCodeObject,
        let data = code.stringValue,
        let type = Self.symbologies.first(where: { $0.type == code.type })?.name
      else { return nil }
      return (type, data)
    }
    guard !codes.isEmpty else { return }
    DispatchQueue.main.async { [weak self] in
      guard let self, self.active, self.window != nil,
        self.metadataOutput === output else { return }
      for (type, data) in codes { self.onCodeScanned?(type, data) }
    }
  }
}
