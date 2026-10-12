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

@objcMembers public final class OneNativeCameraView: UIView {
  public var onStateChange: ((String) -> Void)?
  public var onCodeScanned: ((String, String) -> Void)?

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
  private let metadataDelegate = CameraMetadataDelegate()
  private var sessionObservers: [NSObjectProtocol] = []
  private var rotationCoordinator: AVCaptureDevice.RotationCoordinator?
  private var rotationObservation: NSKeyValueObservation?
  private var sessionPending = false
  private var sessionReady = false
  private var active = false
  private var facing = "back"
  private var codeTypes: [String] = []
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

  public func reset() {
    active = false
    facing = "back"
    codeTypes = []
    refresh()
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
      next.commitConfiguration()

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
        queue.async { [weak self] in
          next.startRunning()
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
