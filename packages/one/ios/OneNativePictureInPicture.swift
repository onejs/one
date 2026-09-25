import AVFoundation
import AVKit
import UIKit

// the layer the system pip window shows. a view, so the fabric host keeps it
// as its first subview, behind the react children and sized to the host.
final class OneNativePictureInPictureLayerView: UIView {
  override class var layerClass: AnyClass { AVSampleBufferDisplayLayer.self }
}

// uniform picture in picture (One.UI.PictureInPicture) on ios. the host's react
// children are rendered into pixel buffers and enqueued on an
// AVSampleBufferDisplayLayer, the content source apple provides for content
// that is not an AVPlayer. frames render only while the window is up, plus one
// before backgrounding so an automatic start opens on current content. the
// timer keeps firing in the background because an active pip session keeps
// the process running.
@objcMembers public final class OneNativePictureInPicture: NSObject {
  public let layerView: UIView = OneNativePictureInPictureLayerView()
  public var onChange: ((Bool) -> Void)?

  private weak var host: UIView?
  private var controller: AVPictureInPictureController?
  private var possibleObservation: NSKeyValueObservation?
  private var requested = false
  private var autoEnter = false
  private var pendingStart = false
  private var timer: Timer?
  private var pool: CVPixelBufferPool?
  private var poolWidth = 0
  private var poolHeight = 0
  private lazy var delegate = Delegate(owner: self)

  private var displayLayer: AVSampleBufferDisplayLayer {
    unsafeDowncast(layerView.layer, to: AVSampleBufferDisplayLayer.self)
  }

  public init(host: UIView) {
    self.host = host
    super.init()
    layerView.isUserInteractionEnabled = false
    layerView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    displayLayer.videoGravity = .resizeAspect
    NotificationCenter.default.addObserver(
      self, selector: #selector(willResignActive),
      name: UIApplication.willResignActiveNotification, object: nil)
    NotificationCenter.default.addObserver(
      self, selector: #selector(didBecomeActive),
      name: UIApplication.didBecomeActiveNotification, object: nil)
  }

  deinit {
    NotificationCenter.default.removeObserver(self)
    timer?.invalidate()
  }

  // active is a request acted on when it changes; onChange reports what the
  // system actually did, including starts and stops it made on its own.
  public func configure(active: Bool, autoEnter: Bool) {
    if autoEnter != self.autoEnter {
      self.autoEnter = autoEnter
      if autoEnter { prepare() }
      controller?.canStartPictureInPictureAutomaticallyFromInline = autoEnter
    }
    if active != requested {
      requested = active
      if active { start() } else { stop() }
    }
  }

  public func reset() {
    requested = false
    autoEnter = false
    pendingStart = false
    stopTimer()
    if let controller, controller.isPictureInPictureActive { controller.stopPictureInPicture() }
    possibleObservation = nil
    controller = nil
    clearInline()
  }

  private func prepare() {
    guard controller == nil, AVPictureInPictureController.isPictureInPictureSupported() else {
      return
    }
    // pip opens only for a playback audio session. mixing keeps the app from
    // interrupting whatever audio the user already has playing.
    let session = AVAudioSession.sharedInstance()
    try? session.setCategory(.playback, mode: .moviePlayback, options: [.mixWithOthers])
    try? session.setActive(true)
    render()
    let source = AVPictureInPictureController.ContentSource(
      sampleBufferDisplayLayer: displayLayer, playbackDelegate: delegate)
    let controller = AVPictureInPictureController(contentSource: source)
    controller.delegate = delegate
    controller.canStartPictureInPictureAutomaticallyFromInline = autoEnter
    // a new controller is not possible yet; a start requested before it is
    // waits here instead of failing.
    possibleObservation = controller.observe(\.isPictureInPicturePossible, options: [.new]) {
      [weak self] controller, _ in
      guard let self, self.pendingStart, controller.isPictureInPicturePossible else { return }
      self.pendingStart = false
      controller.startPictureInPicture()
    }
    self.controller = controller
  }

  private func start() {
    prepare()
    guard let controller else {
      onChange?(false)
      return
    }
    if controller.isPictureInPictureActive { return }
    render()
    if controller.isPictureInPicturePossible {
      controller.startPictureInPicture()
    } else {
      pendingStart = true
    }
  }

  private func stop() {
    pendingStart = false
    controller?.stopPictureInPicture()
  }

  @objc private func willResignActive() {
    if autoEnter { render() }
  }

  // coming back to the app brings the content back inline, as android does.
  @objc private func didBecomeActive() {
    if let controller, controller.isPictureInPictureActive {
      controller.stopPictureInPicture()
    } else {
      clearInline()
    }
  }

  // the layer sits behind the react children, so a frame left on it shows
  // through anything transparent once the pip window is gone.
  private func clearInline() {
    displayLayer.sampleBufferRenderer.flush(removingDisplayedImage: true, completionHandler: nil)
  }

  private func startTimer() {
    guard timer == nil else { return }
    let timer = Timer(timeInterval: 1.0 / 30.0, repeats: true) { [weak self] _ in self?.render() }
    RunLoop.main.add(timer, forMode: .common)
    self.timer = timer
  }

  private func stopTimer() {
    timer?.invalidate()
    timer = nil
  }

  private func render() {
    guard let host else { return }
    let bounds = host.bounds
    let scale = max(host.traitCollection.displayScale, 1)
    let width = Int((bounds.width * scale).rounded())
    let height = Int((bounds.height * scale).rounded())
    guard width > 0, height > 0 else { return }
    if pool == nil || width != poolWidth || height != poolHeight {
      let attributes: [CFString: Any] = [
        kCVPixelBufferPixelFormatTypeKey: kCVPixelFormatType_32BGRA,
        kCVPixelBufferWidthKey: width,
        kCVPixelBufferHeightKey: height,
        kCVPixelBufferIOSurfacePropertiesKey: [:] as [CFString: Any],
      ]
      pool = nil
      CVPixelBufferPoolCreate(nil, nil, attributes as CFDictionary, &pool)
      poolWidth = width
      poolHeight = height
    }
    guard let pool else { return }
    var pixelBuffer: CVPixelBuffer?
    CVPixelBufferPoolCreatePixelBuffer(nil, pool, &pixelBuffer)
    guard let pixelBuffer else { return }

    CVPixelBufferLockBaseAddress(pixelBuffer, [])
    if let context = CGContext(
      data: CVPixelBufferGetBaseAddress(pixelBuffer), width: width, height: height,
      bitsPerComponent: 8, bytesPerRow: CVPixelBufferGetBytesPerRow(pixelBuffer),
      space: CGColorSpaceCreateDeviceRGB(),
      bitmapInfo: CGImageAlphaInfo.premultipliedFirst.rawValue
        | CGBitmapInfo.byteOrder32Little.rawValue)
    {
      context.translateBy(x: 0, y: CGFloat(height))
      context.scaleBy(x: scale, y: -scale)
      // the pip window has no backdrop, so transparent content sits on the
      // host's background, or the system background when it has none.
      let background =
        host.layer.backgroundColor.flatMap { $0.alpha > 0 ? $0 : nil }
        ?? UIColor.systemBackground.resolvedColor(with: host.traitCollection).cgColor
      context.setFillColor(background)
      context.fill(CGRect(origin: .zero, size: bounds.size))
      for view in host.subviews where view !== layerView && !view.isHidden {
        context.saveGState()
        context.translateBy(x: view.frame.minX, y: view.frame.minY)
        view.layer.render(in: context)
        context.restoreGState()
      }
    }
    CVPixelBufferUnlockBaseAddress(pixelBuffer, [])

    var format: CMVideoFormatDescription?
    CMVideoFormatDescriptionCreateForImageBuffer(
      allocator: nil, imageBuffer: pixelBuffer, formatDescriptionOut: &format)
    guard let format else { return }
    var timing = CMSampleTimingInfo(
      duration: .invalid, presentationTimeStamp: CMClockGetTime(CMClockGetHostTimeClock()),
      decodeTimeStamp: .invalid)
    var sampleBuffer: CMSampleBuffer?
    CMSampleBufferCreateReadyWithImageBuffer(
      allocator: nil, imageBuffer: pixelBuffer, formatDescription: format,
      sampleTiming: &timing, sampleBufferOut: &sampleBuffer)
    guard let sampleBuffer else { return }
    if let attachments = CMSampleBufferGetSampleAttachmentsArray(
      sampleBuffer, createIfNecessary: true), CFArrayGetCount(attachments) > 0
    {
      let attachment = unsafeBitCast(
        CFArrayGetValueAtIndex(attachments, 0), to: CFMutableDictionary.self)
      CFDictionarySetValue(
        attachment, Unmanaged.passUnretained(kCMSampleAttachmentKey_DisplayImmediately).toOpaque(),
        Unmanaged.passUnretained(kCFBooleanTrue).toOpaque())
    }
    let renderer = displayLayer.sampleBufferRenderer
    // decoding fails while the app is backgrounded without an active window;
    // a flush is the documented way back.
    if renderer.status == .failed || renderer.requiresFlushToResumeDecoding { renderer.flush() }
    renderer.enqueue(sampleBuffer)
  }

  // the avkit conformances live on a private object: on the public class they
  // would land in One-Swift.h, which objective-c++ files import
  // without AVKit.
  private final class Delegate: NSObject, AVPictureInPictureControllerDelegate,
    AVPictureInPictureSampleBufferPlaybackDelegate
  {
    weak var owner: OneNativePictureInPicture?

    init(owner: OneNativePictureInPicture) {
      self.owner = owner
    }

    func pictureInPictureControllerWillStartPictureInPicture(
      _ controller: AVPictureInPictureController
    ) {
      owner?.startTimer()
    }

    func pictureInPictureControllerDidStartPictureInPicture(
      _ controller: AVPictureInPictureController
    ) {
      owner?.onChange?(true)
    }

    func pictureInPictureController(
      _ controller: AVPictureInPictureController,
      failedToStartPictureInPictureWithError error: Error
    ) {
      owner?.stopTimer()
      owner?.clearInline()
      owner?.onChange?(false)
    }

    func pictureInPictureControllerDidStopPictureInPicture(
      _ controller: AVPictureInPictureController
    ) {
      owner?.stopTimer()
      owner?.clearInline()
      owner?.onChange?(false)
    }

    func pictureInPictureController(
      _ controller: AVPictureInPictureController,
      restoreUserInterfaceForPictureInPictureStopWithCompletionHandler completionHandler:
        @escaping (Bool) -> Void
    ) {
      completionHandler(true)
    }

    // live content: an unbounded range hides the scrubber and skip buttons,
    // and it never pauses, so the play button has nothing to toggle.

    func pictureInPictureController(
      _ controller: AVPictureInPictureController, setPlaying playing: Bool
    ) {
      controller.invalidatePlaybackState()
    }

    func pictureInPictureControllerTimeRangeForPlayback(
      _ controller: AVPictureInPictureController
    ) -> CMTimeRange {
      CMTimeRange(start: .negativeInfinity, duration: .positiveInfinity)
    }

    func pictureInPictureControllerIsPlaybackPaused(
      _ controller: AVPictureInPictureController
    ) -> Bool {
      false
    }

    func pictureInPictureController(
      _ controller: AVPictureInPictureController,
      didTransitionToRenderSize newRenderSize: CMVideoDimensions
    ) {}

    func pictureInPictureController(
      _ controller: AVPictureInPictureController, skipByInterval skipInterval: CMTime,
      completion completionHandler: @escaping () -> Void
    ) {
      completionHandler()
    }
  }
}
