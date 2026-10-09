import { commonFields, type Control } from './controlTypes'
import { SF_SYMBOL_PUBLIC_TYPE } from './sfSymbolNames'

// controls that come from SwiftUI's overlay modules rather than SwiftUI itself. VideoPlayer
// lives in _AVKit_SwiftUI, PhotosPicker in _PhotosUI_SwiftUI and WebView in _WebKit_SwiftUI,
// all of which the generator reads alongside every other _*_SwiftUI module.
export const mediaControls: Control[] = [
  {
    name: 'VideoPlayer',
    // video has no ideal height to report, so it takes the box React Native gave it.
    layout: 'fill',
    imports: ['AVKit'],
    fields: {
      url: { type: 'string', default: '' },
      autoplay: { type: 'boolean', default: false },
      command: { type: 'string', default: '', publicType: "'play' | 'pause' | 'seek'" },
      commandRevision: { type: 'Double', default: 0 },
      seekToMs: { type: 'Double', default: 0 },
    },
    actions: [
      {
        prop: 'onPlaybackStatus',
        event: 'PlaybackStatus',
        payload: { state: 'string', positionMs: 'Double', durationMs: 'Double' },
      },
    ],
    constructors: [
      {
        type: 'VideoPlayer',
        parameters: [{ label: 'player', type: 'AVFoundation.AVPlayer?' }],
      },
    ],
    swift: `VideoPlayerSurface(model: model)`,
    extraSwift: `private final class OneNativeVideoSession: ObservableObject {
  @Published private(set) var player: AVPlayer?
  private var loaded: String?
  private var timeObserver: Any?
  private var controlObservation: NSKeyValueObservation?
  private var itemObservation: NSKeyValueObservation?
  private var endObserver: NSObjectProtocol?
  private var ended = false
  private var appliedRevision: Double = 0
  var report: ((String, Double, Double) -> Void)?

  deinit { clear() }

  // a player owns its position. changing unrelated React props must not recreate it.
  func load(_ url: String, autoplay: Bool) {
    guard loaded != url else { return }
    clear()
    loaded = url
    guard let parsed = URL(string: url) else { return }
    let next = AVPlayer(url: parsed)
    player = next
    controlObservation = next.observe(\\.timeControlStatus, options: [.new]) { [weak self] _, _ in
      DispatchQueue.main.async { self?.emit() }
    }
    if let item = next.currentItem {
      itemObservation = item.observe(\\.status, options: [.new]) { [weak self] _, _ in
        DispatchQueue.main.async { self?.emit() }
      }
      endObserver = NotificationCenter.default.addObserver(
        forName: .AVPlayerItemDidPlayToEndTime, object: item, queue: .main
      ) { [weak self] _ in
        self?.ended = true
        self?.emit()
      }
    }
    timeObserver = next.addPeriodicTimeObserver(
      forInterval: CMTime(seconds: 0.5, preferredTimescale: 600), queue: .main
    ) { [weak self] _ in
      guard let self, let player = self.player else { return }
      if self.ended, player.currentTime().seconds + 0.5 < (player.currentItem?.duration.seconds ?? 0) {
        self.ended = false
      }
      self.emit()
    }
    if autoplay { next.play() }
    emit()
  }

  func apply(_ command: String, revision: Double, seekToMs: Double) {
    guard revision > appliedRevision else { return }
    guard let player else { return }
    appliedRevision = revision
    switch command {
    case "play":
      if ended { player.seek(to: .zero); ended = false }
      player.play()
    case "pause": player.pause()
    case "seek":
      ended = false
      player.seek(to: CMTime(seconds: seekToMs / 1000, preferredTimescale: 600)) { [weak self] _ in
        DispatchQueue.main.async { self?.emit() }
      }
    default: return
    }
    emit()
  }

  private func emit() {
    guard let player else { return }
    let seconds = player.currentTime().seconds
    let duration = player.currentItem?.duration.seconds ?? 0
    let state: String
    if player.currentItem?.status == .failed { state = "failed" }
    else if ended { state = "ended" }
    else if player.timeControlStatus == .playing { state = "playing" }
    else if player.timeControlStatus == .waitingToPlayAtSpecifiedRate { state = "loading" }
    else { state = "paused" }
    report?(state, seconds.isFinite ? max(0, seconds * 1000) : 0,
            duration.isFinite ? max(0, duration * 1000) : 0)
  }

  private func clear() {
    controlObservation = nil
    itemObservation = nil
    if let endObserver { NotificationCenter.default.removeObserver(endObserver) }
    endObserver = nil
    if let player, let timeObserver { player.removeTimeObserver(timeObserver) }
    timeObserver = nil
    player?.pause()
    player = nil
    ended = false
  }
}

private struct VideoPlayerSurface: View {
  @ObservedObject var model: VideoPlayerModel
  @StateObject private var session = OneNativeVideoSession()
  var body: some View {
    VideoPlayer(player: session.player)
      .onAppear {
        session.report = { [weak model = model] state, position, duration in
          model?.playbackStatus(state, position, duration)
        }
        session.load(model.url, autoplay: model.autoplay)
        if model.commandRevision > 0 {
          session.apply(model.command, revision: model.commandRevision, seekToMs: model.seekToMs)
        }
      }
      .onChange(of: model.url) { session.load(model.url, autoplay: model.autoplay) }
      .onChange(of: model.commandRevision) {
        if model.commandRevision > 0 {
          session.apply(model.command, revision: model.commandRevision, seekToMs: model.seekToMs)
        }
      }
  }
}
`,
    validate: `  if (typeof url !== 'string' || !url) throw new Error('VideoPlayer url must be a non-empty string')
  if (!['', 'play', 'pause', 'seek'].includes(command)) throw new Error('Unknown VideoPlayer command: ' + command)
  if (!Number.isSafeInteger(commandRevision) || commandRevision < 0) throw new Error('VideoPlayer commandRevision must be a nonnegative safe integer')
  if (command && commandRevision === 0) throw new Error('VideoPlayer command requires a positive commandRevision')
  if (!command && commandRevision > 0) throw new Error('VideoPlayer commandRevision requires a command')
  if (!Number.isFinite(seekToMs) || seekToMs < 0) throw new Error('VideoPlayer seekToMs must be a nonnegative finite number')`,
  },
  {
    name: 'LivePhotoView',
    layout: 'fill',
    imports: ['Photos', 'PhotosUI'],
    fields: {
      assetIdentifier: { type: 'string', default: '', required: true },
      autoplay: { type: 'boolean', default: false },
      command: { type: 'string', default: '', publicType: "'play' | 'stop'" },
      commandRevision: { type: 'Double', default: 0 },
    },
    actions: [
      {
        prop: 'onPlaybackState',
        event: 'PlaybackState',
        payload: { state: 'string', errorCode: 'string' },
      },
    ],
    constructors: [],
    swift: `LivePhotoSurface(model: model)`,
    extraSwift: `private final class OneNativeLivePhotoSession: NSObject, ObservableObject, PHLivePhotoViewDelegate {
  weak var view: PHLivePhotoView?
  private var livePhoto: PHLivePhoto?
  private var identifier = ""
  private var generation = 0
  private var requestId = PHInvalidImageRequestID
  private var appliedRevision: Double = 0
  private var pendingCommand: String?
  private var autoplay = false
  private var manualStop = false
  private var state = ""
  private var errorCode = ""
  var report: ((String, String) -> Void)?

  deinit {
    if requestId != PHInvalidImageRequestID {
      PHImageManager.default().cancelImageRequest(requestId)
    }
    view?.delegate = nil
    view?.stopPlayback()
  }

  func attach(_ view: PHLivePhotoView) {
    self.view = view
    view.delegate = self
    view.livePhoto = livePhoto
  }

  func detach(_ view: PHLivePhotoView) {
    view.delegate = nil
    view.stopPlayback()
    if self.view === view { self.view = nil }
  }

  func clear() {
    generation += 1
    if requestId != PHInvalidImageRequestID {
      PHImageManager.default().cancelImageRequest(requestId)
      requestId = PHInvalidImageRequestID
    }
    manualStop = true
    view?.stopPlayback()
    view?.livePhoto = nil
    livePhoto = nil
    identifier = ""
    pendingCommand = nil
  }

  func configure(_ nextIdentifier: String, autoplay: Bool, command: String, revision: Double) {
    self.autoplay = autoplay
    if identifier != nextIdentifier {
      clear()
      identifier = nextIdentifier
      state = ""
      errorCode = ""
      emit("loading")
      guard !nextIdentifier.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
        fail("E_LIVE_PHOTO_INPUT")
        return
      }
      let permission = PHPhotoLibrary.authorizationStatus(for: .readWrite)
      guard permission == .authorized || permission == .limited else {
        fail("E_LIVE_PHOTO_PERMISSION")
        return
      }
      guard let asset = PHAsset.fetchAssets(withLocalIdentifiers: [nextIdentifier], options: nil).firstObject else {
        fail("E_LIVE_PHOTO_NOT_FOUND")
        return
      }
      guard asset.mediaSubtypes.contains(.photoLive) else {
        fail("E_LIVE_PHOTO_NOT_LIVE")
        return
      }
      let currentGeneration = generation
      let options = PHLivePhotoRequestOptions()
      options.deliveryMode = .highQualityFormat
      options.isNetworkAccessAllowed = false
      requestId = PHImageManager.default().requestLivePhoto(for: asset,
        targetSize: CGSize(width: 1280, height: 1280), contentMode: .aspectFit,
        options: options) { [weak self] photo, info in
        DispatchQueue.main.async { [weak self] in
          guard let self, self.generation == currentGeneration else { return }
          if info?[PHImageResultIsDegradedKey] as? Bool == true { return }
          self.requestId = PHInvalidImageRequestID
          guard let photo, info?[PHImageErrorKey] == nil else {
            self.fail("E_LIVE_PHOTO_LOAD")
            return
          }
          self.livePhoto = photo
          self.view?.livePhoto = photo
          self.emit("ready")
          if let pending = self.pendingCommand {
            self.pendingCommand = nil
            self.execute(pending)
          } else if self.autoplay {
            self.execute("play")
          }
        }
      }
    }
    guard revision > appliedRevision else { return }
    appliedRevision = revision
    if livePhoto != nil { execute(command) }
    else if state != "failed" { pendingCommand = command }
  }

  private func execute(_ command: String) {
    guard livePhoto != nil else { return }
    switch command {
    case "play":
      manualStop = false
      view?.startPlayback(with: .full)
    case "stop":
      manualStop = true
      view?.stopPlayback()
      emit("ready")
    default: break
    }
  }

  private func fail(_ code: String) {
    pendingCommand = nil
    emit("failed", code)
  }

  private func emit(_ nextState: String, _ code: String = "") {
    let nextCode = nextState == "failed" ? code : ""
    guard state != nextState || errorCode != nextCode else { return }
    state = nextState
    errorCode = nextCode
    report?(nextState, nextCode)
  }

  func livePhotoView(_ livePhotoView: PHLivePhotoView,
    willBeginPlaybackWith playbackStyle: PHLivePhotoViewPlaybackStyle) {
    manualStop = false
    emit("playing")
  }

  func livePhotoView(_ livePhotoView: PHLivePhotoView,
    didEndPlaybackWith playbackStyle: PHLivePhotoViewPlaybackStyle) {
    if !manualStop { emit("ended") }
  }
}

private struct OneNativeLivePhotoContainer: UIViewRepresentable {
  let session: OneNativeLivePhotoSession

  func makeCoordinator() -> OneNativeLivePhotoSession { session }
  func makeUIView(context: Context) -> PHLivePhotoView {
    let view = PHLivePhotoView()
    view.contentMode = .scaleAspectFit
    session.attach(view)
    return view
  }
  func updateUIView(_ view: PHLivePhotoView, context: Context) {}
  static func dismantleUIView(_ view: PHLivePhotoView, coordinator: OneNativeLivePhotoSession) {
    coordinator.detach(view)
  }
}

private struct LivePhotoSurface: View {
  @ObservedObject var model: LivePhotoViewModel
  @StateObject private var session = OneNativeLivePhotoSession()

  private func configure() {
    session.configure(model.assetIdentifier, autoplay: model.autoplay,
      command: model.command, revision: model.commandRevision)
  }

  var body: some View {
    OneNativeLivePhotoContainer(session: session)
      .onAppear {
        session.report = { state, errorCode in
          model.playbackState(state, errorCode)
        }
        // the generated host marks its model active after attaching the view.
        // defer the first status so loading and immediate failures reach fabric.
        DispatchQueue.main.async {
          guard session.report != nil else { return }
          configure()
        }
      }
      .onChange(of: model.assetIdentifier) { configure() }
      .onChange(of: model.autoplay) { configure() }
      .onChange(of: model.commandRevision) { configure() }
      .onDisappear {
        session.report = nil
        session.clear()
      }
  }
}
`,
    validate: `  if (typeof assetIdentifier !== 'string' || !assetIdentifier.trim()) throw new Error('LivePhotoView assetIdentifier must be a non-empty string')
  if (!['', 'play', 'stop'].includes(command)) throw new Error('Unknown LivePhotoView command: ' + command)
  if (!Number.isSafeInteger(commandRevision) || commandRevision < 0) throw new Error('LivePhotoView commandRevision must be a nonnegative safe integer')
  if (command && commandRevision === 0) throw new Error('LivePhotoView command requires a positive commandRevision')
  if (!command && commandRevision > 0) throw new Error('LivePhotoView commandRevision requires a command')`,
  },
  {
    // PhotosPicker hands back PhotosPickerItem, which is a promise of data rather than a
    // file. loading it is asynchronous and per item, so each loaded item is its own numbered
    // event carrying the index it held in the selection and how many were picked; a caller
    // collecting a multiple selection reassembles it from those.
    name: 'PhotosPicker',
    imports: ['PhotosUI', 'CoreTransferable', 'UniformTypeIdentifiers'],
    actions: [
      {
        prop: 'onPick',
        event: 'Pick',
        payload: { url: 'string', index: 'Double', count: 'Double' },
      },
      {
        prop: 'onPickItemIdentifier',
        event: 'PickItemIdentifier',
        payload: { itemIdentifier: 'string', index: 'Double', count: 'Double' },
      },
      { prop: 'onPickError', event: 'PickError', payload: { message: 'string' } },
    ],
    fields: {
      ...commonFields,
      systemImage: { type: 'string', default: '', publicType: SF_SYMBOL_PUBLIC_TYPE },
      // zero is the SDK's nil, which is an unlimited selection.
      maxSelectionCount: { type: 'Double', default: 1 },
      selectionBehavior: {
        type: 'string',
        default: 'default',
        enum: 'PhotosPickerSelectionBehavior',
      },
      filter: {
        type: 'string',
        default: 'any',
        publicType:
          "'any' | 'images' | 'videos' | 'livePhotos' | 'screenshots' | 'screenRecordings' | 'slomoVideos' | 'timelapseVideos' | 'cinematicVideos' | 'depthEffectPhotos' | 'bursts' | 'panoramas'",
      },
      preferredItemEncoding: {
        type: 'string',
        default: 'automatic',
        enum: 'EncodingDisambiguationPolicy',
      },
    },
    constructors: [
      {
        type: 'PhotosPicker',
        parameters: [
          {
            label: 'selection',
            type: 'SwiftUICore.Binding<[_PhotosUI_SwiftUI.PhotosPickerItem]>',
          },
          { label: 'maxSelectionCount', type: 'Swift.Int?' },
          {
            label: 'selectionBehavior',
            type: '_PhotosUI_SwiftUI.PhotosPickerSelectionBehavior',
          },
          { label: 'matching', type: 'PhotosUI.PHPickerFilter?' },
          {
            label: 'preferredItemEncoding',
            type: '_PhotosUI_SwiftUI.PhotosPickerItem.EncodingDisambiguationPolicy',
          },
          { label: 'label', type: '@Sendable () -> Label' },
        ],
      },
    ],
    swift: `PhotosPickerSurface(model: model)`,
    extraSwift: `// PHPickerFilter is PhotosUI's own type rather than its SwiftUI overlay's, so the generator
// does not read it and cannot select these cases. swiftc -typecheck against the SDK is what
// proves each one still exists.
private func oneNativePhotosFilter(_ value: String) -> PHPickerFilter? {
  switch value {
  case "any": return nil
  case "images": return .images
  case "videos": return .videos
  case "livePhotos": return .livePhotos
  case "screenshots": return .screenshots
  case "screenRecordings": return .screenRecordings
  case "slomoVideos": return .slomoVideos
  case "timelapseVideos": return .timelapseVideos
  case "cinematicVideos": return .cinematicVideos
  case "depthEffectPhotos": return .depthEffectPhotos
  case "bursts": return .bursts
  case "panoramas": return .panoramas
  default: preconditionFailure("invalid PHPickerFilter: \\(value)")
  }
}
func oneNativePickerFile(_ data: Data, extension ext: String) throws -> URL {
  let url = FileManager.default.temporaryDirectory
    .appendingPathComponent("one-native-photo-\\(UUID().uuidString)")
    .appendingPathExtension(ext)
  try data.write(to: url)
  return url
}
private struct PhotosPickerSurface: View {
  @ObservedObject var model: PhotosPickerModel
  // the picker owns its selection; React never sets it, so it lives here rather than in the
  // model and is emptied as soon as the items have been handed on.
  @State private var selection: [PhotosPickerItem] = []
  var body: some View {
    PhotosPicker(
      selection: $selection,
      maxSelectionCount: model.maxSelectionCount > 0 ? Int(model.maxSelectionCount) : nil,
      selectionBehavior: OneNativeGenerated.photosPickerSelectionBehavior(model.selectionBehavior),
      matching: oneNativePhotosFilter(model.filter),
      preferredItemEncoding: OneNativeGenerated.encodingDisambiguationPolicy(model.preferredItemEncoding)
    ) {
      if model.systemImage.isEmpty { Text(model.label) }
      else { Label(model.label, systemImage: model.systemImage) }
    }
    .onChange(of: selection) { _, items in
      guard !items.isEmpty else { return }
      selection = []
      deliver(items)
    }
  }
  // one task per item: they finish out of order, which is why the event carries its index.
  private func deliver(_ items: [PhotosPickerItem]) {
    let count = items.count
    for (index, item) in items.enumerated() {
      if let id = item.itemIdentifier { model.pickItemIdentifier(id, Double(index), Double(count)) }
      Task { @MainActor in
        do {
          guard let data = try await item.loadTransferable(type: Data.self) else {
            model.pickError("the picked item carries no data")
            return
          }
          let url = try oneNativePickerFile(data, extension: item.supportedContentTypes.first?.preferredFilenameExtension ?? "dat")
          model.pick(url.absoluteString, Double(index), Double(count))
        } catch {
          model.pickError(error.localizedDescription)
        }
      }
    }
  }
}
`,
    validate: `  if (typeof label !== 'string' || !label) throw new Error('PhotosPicker label must be a non-empty string')
  if (!Number.isInteger(maxSelectionCount) || maxSelectionCount < 0) throw new Error('PhotosPicker maxSelectionCount must be a nonnegative integer; 0 is unlimited')
  if (!['any', 'images', 'videos', 'livePhotos', 'screenshots', 'screenRecordings', 'slomoVideos', 'timelapseVideos', 'cinematicVideos', 'depthEffectPhotos', 'bursts', 'panoramas'].includes(filter)) throw new Error('Unknown PhotosPicker filter: ' + filter)`,
  },
  {
    // WebView is iOS 26 only, so the recipe gates on availability and renders clear on 17 through 25.
    // it renders a WebPage, the observable navigation state WebKit's SwiftUI surface owns,
    // which is what makes the current url, the title and load progress readable from React.
    name: 'WebView',
    // a web page has no ideal height to report, so it takes the box React Native gave it.
    layout: 'fill',
    imports: ['WebKit'],
    actions: [
      { prop: 'onNavigate', event: 'Navigate', payload: { url: 'string' } },
      { prop: 'onTitleChange', event: 'TitleChange', payload: { title: 'string' } },
      {
        prop: 'onLoadingChange',
        event: 'LoadingChange',
        payload: { loading: 'boolean', progress: 'Double' },
      },
      { prop: 'onLoadStart', event: 'LoadStart' },
      { prop: 'onLoadEnd', event: 'LoadEnd' },
      { prop: 'onError', event: 'Error', payload: { message: 'string' } },
      { prop: 'onHttpError', event: 'HttpError', payload: { statusCode: 'Double' } },
      { prop: 'onMessage', event: 'Message', payload: { data: 'string' } },
      {
        prop: 'onHistoryChange',
        event: 'HistoryChange',
        payload: { canGoBack: 'boolean', canGoForward: 'boolean' },
      },
      { prop: 'onProcessTerminate', event: 'ProcessTerminate' },
    ],
    fields: {
      url: { type: 'string', default: '' },
      // markup the app already holds, loaded through WebPage.load(html:) rather than
      // fetched. exclusive with url.
      html: { type: 'string', default: '' },
      // document-start javascript in the main frame. installed with the page
      // configuration, so changing it builds a new page and loads the source again.
      script: { type: 'string', default: '' },
      command: {
        type: 'string',
        default: '',
        publicType: "'reload' | 'goBack' | 'goForward' | 'evaluate' | 'postMessage'",
      },
      commandRevision: { type: 'Double', default: 0 },
      commandValue: { type: 'string', default: '' },
      limitsNavigationsToAppBoundDomains: { type: 'boolean', default: false },
      inlineMedia: { type: 'boolean', default: false },
      inspectable: { type: 'boolean', default: false },
      bounces: { type: 'boolean', default: true },
      backForwardNavigationGestures: {
        type: 'string',
        default: '',
        enum: 'BackForwardNavigationGesturesBehavior',
      },
      magnificationGestures: {
        type: 'string',
        default: '',
        enum: 'MagnificationGesturesBehavior',
      },
      linkPreviews: { type: 'string', default: '', enum: 'LinkPreviewBehavior' },
      elementFullscreen: {
        type: 'string',
        default: '',
        enum: 'ElementFullscreenBehavior',
      },
      contentBackground: { type: 'string', default: '', enum: 'Visibility' },
    },
    constructors: [
      { type: 'WebView', parameters: [{ label: '_', type: 'WebKit.WebPage' }] },
    ],
    swift: `Group {
      if #available(iOS 26.0, *) {
        WebViewSurface(model: model)
          .oneNativeWebViewBackForwardNavigationGestures(model.backForwardNavigationGestures)
          .oneNativeWebViewMagnificationGestures(model.magnificationGestures)
          .oneNativeWebViewLinkPreviews(model.linkPreviews)
          .oneNativeWebViewElementFullscreenBehavior(model.elementFullscreen)
          .oneNativeWebViewContentBackground(model.contentBackground)
      } else {
        Color.clear
      }
    }`,
    extraSwift: `// the page is created with its script bridge and navigation policy, because those
// are configuration. url and html still load once per value so later prop changes
// keep the scroll position and the back-forward list. commands are a separate
// revision, same shape as VideoPlayer.
@available(iOS 26.0, *)
@MainActor private final class OneNativeWebSession: ObservableObject {
  @Published private(set) var page: WebPage?
  private var loaded: String?
  private var configKey: String?
  private var appliedRevision: Double = 0
  private var navigationTask: Task<Void, Never>?
  private var bridge: OneNativeWebBridge?
  private var decider: OneNativeWebDecider?
  private var inspectable = false
  var onMessage: ((String) -> Void)?
  var onLoadStart: (() -> Void)?
  var onLoadEnd: (() -> Void)?
  var onError: ((String) -> Void)?
  var onHttpError: ((Double) -> Void)?
  var onHistory: ((Bool, Bool) -> Void)?
  var onProcessTerminate: (() -> Void)?

  func receive(_ data: String) { onMessage?(data) }
  func receiveHttp(_ statusCode: Int) { onHttpError?(Double(statusCode)) }

  // the surface observes page.url only once the page exists and WebView mounts,
  // which is after load() already set it. report the current url once per page
  // so the initial value is not lost; later changes still arrive via onChange.
  private var seededURLPage: ObjectIdentifier?
  func seedURL() -> String? {
    guard let page else { return nil }
    let id = ObjectIdentifier(page)
    guard seededURLPage != id else { return nil }
    seededURLPage = id
    return page.url?.absoluteString ?? ""
  }

  func configure(script: String, limits: Bool, inlineMedia: Bool, inspectable: Bool) {
    self.inspectable = inspectable
    let key = String(limits) + "|" + String(inlineMedia) + "|" + script
    if key != configKey {
      configKey = key
      loaded = nil
      install(script: script, limits: limits, inlineMedia: inlineMedia)
    }
    page?.isInspectable = inspectable
  }

  // sources the component loaded, oldest first. WebKit records no history for
  // consecutive html loads, so back/forward past the native list traverse these.
  private var sources: [String] = []
  private var sourceIndex: Int = -1

  func load(url: String, html: String) {
    let source = html.isEmpty ? "url:" + url : "html:" + html
    guard loaded != source, let page else { return }
    loaded = source
    if sourceIndex < 0 || sources[sourceIndex] != source {
      sources = Array(sources.prefix(sourceIndex + 1))
      sources.append(source)
      sourceIndex = sources.count - 1
    }
    load(source: source, on: page)
  }

  private func load(source: String, on page: WebPage) {
    if source.hasPrefix("html:") {
      page.load(html: String(source.dropFirst(5)))
    } else if let parsed = URL(string: String(source.dropFirst(4))) {
      page.load(parsed)
    }
  }

  func apply(command: String, revision: Double, value: String) {
    guard revision > appliedRevision else { return }
    guard let page else { return }
    appliedRevision = revision
    switch command {
    case "reload":
      page.reload()
    case "goBack":
      if let item = page.backForwardList.backList.last {
        page.load(item)
      } else if sourceIndex > 0 {
        sourceIndex -= 1
        loaded = sources[sourceIndex]
        load(source: sources[sourceIndex], on: page)
      }
    case "goForward":
      if let item = page.backForwardList.forwardList.first {
        page.load(item)
      } else if sourceIndex >= 0 && sourceIndex + 1 < sources.count {
        sourceIndex += 1
        loaded = sources[sourceIndex]
        load(source: sources[sourceIndex], on: page)
      }
    case "evaluate":
      runJavaScript("eval(s)", value: value)
    case "postMessage":
      runJavaScript("window.dispatchEvent(new MessageEvent('message', { data: s }))", value: value)
    default:
      break
    }
  }

  private func install(script: String, limits: Bool, inlineMedia: Bool) {
    navigationTask?.cancel()
    let controller = WKUserContentController()
    let bootstrap = "window.ReactNativeWebView = { postMessage: function(data) { window.webkit.messageHandlers.ReactNativeWebView.postMessage(String(data)); } };"
    controller.addUserScript(WKUserScript(source: bootstrap, injectionTime: .atDocumentStart, forMainFrameOnly: true))
    if !script.isEmpty {
      controller.addUserScript(WKUserScript(source: script, injectionTime: .atDocumentStart, forMainFrameOnly: true))
    }
    let bridge = OneNativeWebBridge()
    bridge.session = self
    self.bridge = bridge
    controller.add(bridge, name: "ReactNativeWebView")
    var configuration = WebPage.Configuration()
    configuration.userContentController = controller
    configuration.limitsNavigationsToAppBoundDomains = limits
    if inlineMedia { configuration.mediaPlaybackBehavior = .allowsInlinePlayback }
    let decider = OneNativeWebDecider()
    decider.session = self
    self.decider = decider
    let next = WebPage(configuration: configuration, navigationDecider: decider)
    next.isInspectable = inspectable
    page = next
    watch(next)
  }

  private func watch(_ page: WebPage) {
    navigationTask = Task { @MainActor [weak self] in
      do {
        for try await event in page.navigations {
          guard let self else { return }
          switch event {
          case .startedProvisionalNavigation:
            self.onLoadStart?()
            self.publishHistory()
          case .finished:
            self.onLoadEnd?()
            self.publishHistory()
          case .committed, .receivedServerRedirect:
            self.publishHistory()
          @unknown default:
            break
          }
        }
      } catch let error as WebPage.NavigationError {
        guard let self else { return }
        switch error {
        case .webContentProcessTerminated:
          self.onProcessTerminate?()
        case .failedProvisionalNavigation(let underlying):
          self.onError?(underlying.localizedDescription)
        case .invalidURL:
          self.onError?("invalid URL")
        case .pageClosed:
          break
        @unknown default:
          self.onError?(String(describing: error))
        }
      } catch {
        self?.onError?(error.localizedDescription)
      }
    }
  }

  private func publishHistory() {
    guard let page else { return }
    let list = page.backForwardList
    let back = !list.backList.isEmpty || sourceIndex > 0
    let forward = !list.forwardList.isEmpty || (sourceIndex >= 0 && sourceIndex + 1 < sources.count)
    onHistory?(back, forward)
  }

  private func runJavaScript(_ body: String, value: String) {
    guard let page else { return }
    Task { @MainActor in
      do {
        _ = try await page.callJavaScript(body, arguments: ["s": value])
      } catch {
        self.onError?(error.localizedDescription)
      }
    }
  }
}

@available(iOS 26.0, *)
private final class OneNativeWebBridge: NSObject, WKScriptMessageHandler {
  weak var session: OneNativeWebSession?
  func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
    let body = message.body as? String ?? String(describing: message.body)
    let session = self.session
    Task { @MainActor in session?.receive(body) }
  }
}

@available(iOS 26.0, *)
@MainActor
private final class OneNativeWebDecider: WebPage.NavigationDeciding {
  weak var session: OneNativeWebSession?
  func decidePolicy(for response: WebPage.NavigationResponse) async -> WKNavigationResponsePolicy {
    if let http = response.response as? HTTPURLResponse, http.statusCode >= 400 {
      session?.receiveHttp(http.statusCode)
    }
    return .allow
  }
}

@available(iOS 26.0, *)
private struct OneNativeWebScroll: UIViewRepresentable {
  var bounces: Bool
  func makeUIView(context: Context) -> UIView {
    let view = UIView(frame: .zero)
    view.isUserInteractionEnabled = false
    view.backgroundColor = .clear
    return view
  }
  func updateUIView(_ view: UIView, context: Context) {
    let bounces = self.bounces
    DispatchQueue.main.async {
      guard let web = OneNativeWebScroll.find(from: view) else { return }
      web.scrollView.bounces = bounces
      web.scrollView.contentInsetAdjustmentBehavior = .never
    }
  }
  private static func findDown(_ view: UIView) -> WKWebView? {
    if let web = view as? WKWebView { return web }
    for subview in view.subviews {
      if let found = findDown(subview) { return found }
    }
    return nil
  }
  private static func find(from view: UIView) -> WKWebView? {
    var current: UIView? = view
    var hops = 0
    while let next = current, hops < 16 {
      for subview in next.subviews {
        if let found = findDown(subview) { return found }
      }
      current = next.superview
      hops += 1
    }
    return nil
  }
}

@available(iOS 26.0, *)
@MainActor private struct WebViewSurface: View {
  @ObservedObject var model: WebViewModel
  @StateObject private var session = OneNativeWebSession()
  var body: some View {
    Group {
      if let page = session.page {
        WebView(page)
          // reading these here is what subscribes to WebPage's observation. WebKit
          // coalesces its own progress reporting, so this is not a per-frame event.
          .onChange(of: page.url) { _, url in model.navigate(url?.absoluteString ?? "") }
          .onChange(of: page.title) { _, title in model.titleChange(title) }
          .onChange(of: page.isLoading) { _, loading in
            model.loadingChange(loading, page.estimatedProgress)
          }
          .onChange(of: page.estimatedProgress) { _, progress in
            model.loadingChange(page.isLoading, progress)
          }
          .overlay(OneNativeWebScroll(bounces: model.bounces).allowsHitTesting(false))
      } else {
        Color.clear
      }
    }
    .onAppear { sync(includeCommand: true) }
    .onChange(of: model.url) { sync(includeCommand: false) }
    .onChange(of: model.html) { sync(includeCommand: false) }
    .onChange(of: model.script) { sync(includeCommand: false) }
    .onChange(of: model.limitsNavigationsToAppBoundDomains) { sync(includeCommand: false) }
    .onChange(of: model.inlineMedia) { sync(includeCommand: false) }
    .onChange(of: model.inspectable) { sync(includeCommand: false) }
    .onChange(of: model.commandRevision) { sync(includeCommand: true) }
  }
  private func sync(includeCommand: Bool) {
    session.onMessage = { [weak model] data in model?.message(data) }
    session.onLoadStart = { [weak model] in model?.loadStart() }
    session.onLoadEnd = { [weak model] in model?.loadEnd() }
    session.onError = { [weak model] message in model?.error(message) }
    session.onHttpError = { [weak model] status in model?.httpError(status) }
    session.onHistory = { [weak model] back, forward in model?.historyChange(back, forward) }
    session.onProcessTerminate = { [weak model] in model?.processTerminate() }
    session.configure(
      script: model.script,
      limits: model.limitsNavigationsToAppBoundDomains,
      inlineMedia: model.inlineMedia,
      inspectable: model.inspectable
    )
    session.load(url: model.url, html: model.html)
    if let url = session.seedURL() { model.navigate(url) }
    if includeCommand {
      session.apply(command: model.command, revision: model.commandRevision, value: model.commandValue)
    }
  }
}
`,
    validate: `  if (!url === !html) throw new Error('WebView takes exactly one of url and html')
  if (!['', 'reload', 'goBack', 'goForward', 'evaluate', 'postMessage'].includes(command)) throw new Error('Unknown WebView command: ' + command)
  if (!Number.isSafeInteger(commandRevision) || commandRevision < 0) throw new Error('WebView commandRevision must be a nonnegative safe integer')
  if (command && commandRevision === 0) throw new Error('WebView command requires a positive commandRevision')
  if (!command && commandRevision > 0) throw new Error('WebView commandRevision requires a command')
  if (typeof commandValue !== 'string') throw new Error('WebView commandValue must be a string')
  if ((command === 'evaluate' || command === 'postMessage') && !commandValue) throw new Error('WebView ' + command + ' requires commandValue')
  if (typeof script !== 'string') throw new Error('WebView script must be a string')`,
  },
  {
    // one view covers the button and the request: the props set what onRequest would
    // (scopes, nonce) and the Result arrives as one completion event, so there is no
    // imperative module. from _AuthenticationServices_SwiftUI, which the generator reads
    // like every other overlay; ASAuthorization.Scope lives in AuthenticationServices
    // itself, so the two scopes are mapped by hand like PhotosPicker's filter.
    name: 'SignInWithAppleButton',
    imports: ['AuthenticationServices'],
    actions: [
      {
        prop: 'onCompletion',
        event: 'Completion',
        payload: {
          type: 'string',
          user: 'string',
          email: 'string',
          givenName: 'string',
          familyName: 'string',
          identityToken: 'string',
          authorizationCode: 'string',
          message: 'string',
        },
        object: {
          variants: [
            {
              type: 'success',
              fields: ['user', 'email', 'givenName', 'familyName', 'identityToken', 'authorizationCode'],
            },
            { type: 'failed', fields: ['message'] },
            { type: 'cancelled', fields: [] },
          ],
        },
      },
    ],
    fields: {
      requestedScopes: {
        type: 'strings',
        default: [],
        publicType: "readonly ('fullName' | 'email')[]",
      },
      nonce: { type: 'string', default: '' },
      label: { type: 'string', default: 'signIn', publicType: "'signIn' | 'continue' | 'signUp'" },
    },
    setBody: {
      requestedScopes: `if let unknown = items.first(where: { $0 != "fullName" && $0 != "email" }) {
    model.completion("failed", "", "", "", "", "", "", "unknown requested scope: \\(unknown)")
    return
  }
  if model.requestedScopes != items { model.requestedScopes = items }`,
    },
    constructors: [
      {
        type: 'SignInWithAppleButton',
        parameters: [
          {
            label: '_',
            type: '_AuthenticationServices_SwiftUI.SignInWithAppleButton.Label',
          },
          {
            label: 'onRequest',
            type: '@escaping (AuthenticationServices.ASAuthorizationAppleIDRequest) -> Swift.Void',
          },
          {
            label: 'onCompletion',
            type: '@escaping (Swift.Result<AuthenticationServices.ASAuthorization, any Swift.Error>) -> Swift.Void',
          },
        ],
      },
    ],
    swift: `SignInWithAppleButtonSurface(model: model)`,
    extraSwift: `// ASAuthorization.Scope is AuthenticationServices' own type rather than its SwiftUI
// overlay's, so the generator does not read it and cannot select these cases.
// swiftc -typecheck against the SDK is what proves each one still exists.
private func oneNativeAppleScopes(_ values: [String]) -> [ASAuthorization.Scope] {
  // unknown strings never reach here: the setter rejects them with a failed
  // completion, so the default only drops what validation already refused.
  values.compactMap { value in
    switch value {
    case "fullName": return .fullName
    case "email": return .email
    default: return nil
    }
  }
}

// the tokens arrive as UTF-8 JWT data. the empty string is the missing-token state the
// caller already handles, so undecodable bytes degrade to it instead of failing the
// completion that carried them.
private func oneNativeTokenString(_ data: Data?) -> String {
  guard let data else { return "" }
  return String(data: data, encoding: .utf8) ?? ""
}

// validate admits only these three, so the default case is unreachable
private func oneNativeAppleButtonLabel(_ value: String) -> SignInWithAppleButton.Label {
  switch value {
  case "continue": return .continue
  case "signUp": return .signUp
  default: return .signIn
  }
}

private struct SignInWithAppleButtonSurface: View {
  @ObservedObject var model: SignInWithAppleButtonModel
  var body: some View {
    SignInWithAppleButton(oneNativeAppleButtonLabel(model.label), onRequest: { request in
      request.requestedScopes = oneNativeAppleScopes(model.requestedScopes)
      if !model.nonce.isEmpty { request.nonce = model.nonce }
    }, onCompletion: { result in
      switch result {
      case .success(let authorization):
        guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential else {
          model.completion("failed", "", "", "", "", "", "", "unexpected credential type")
          return
        }
        model.completion(
          "success",
          credential.user,
          credential.email ?? "",
          credential.fullName?.givenName ?? "",
          credential.fullName?.familyName ?? "",
          oneNativeTokenString(credential.identityToken),
          oneNativeTokenString(credential.authorizationCode),
          ""
        )
      case .failure(let error):
        let nsError = error as NSError
        if nsError.domain == ASAuthorizationErrorDomain,
          nsError.code == ASAuthorizationError.Code.canceled.rawValue {
          model.completion("cancelled", "", "", "", "", "", "", "")
        } else {
          model.completion("failed", "", "", "", "", "", "", error.localizedDescription)
        }
      }
    })
  }
}
`,
    validate: `  if (!Array.isArray(requestedScopes)) throw new Error('SignInWithAppleButton requestedScopes must be an array')
  for (const scope of requestedScopes) {
    if (scope !== 'fullName' && scope !== 'email') throw new Error("SignInWithAppleButton scope must be 'fullName' or 'email'")
  }
  if (typeof nonce !== 'string') throw new Error('SignInWithAppleButton nonce must be a string')
  if (label !== 'signIn' && label !== 'continue' && label !== 'signUp') throw new Error("SignInWithAppleButton label must be 'signIn', 'continue' or 'signUp'")`,
  },
]
