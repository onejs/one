import { commonFields, type Control } from './controlTypes'

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
    },
    constructors: [
      {
        type: 'VideoPlayer',
        parameters: [{ label: 'player', type: 'AVFoundation.AVPlayer?' }],
      },
    ],
    swift: `VideoPlayerSurface(url: model.url, autoplay: model.autoplay)`,
    extraSwift: `// AVPlayer holds the playback position and is expensive to build, so it is created once per
// url and replaced only when the url changes. building it in body would restart playback
// every time any other prop moved.
private struct VideoPlayerSurface: View {
  let url: String
  let autoplay: Bool
  @State private var player: AVPlayer?
  @State private var loaded: String?
  var body: some View {
    VideoPlayer(player: player)
      .onAppear { load() }
      .onChange(of: url) { load() }
  }
  // autoplay is read when the url loads, so flipping it later does not restart the video.
  private func load() {
    guard loaded != url else { return }
    loaded = url
    guard let parsed = URL(string: url) else { player = nil; return }
    let next = AVPlayer(url: parsed)
    player = next
    if autoplay { next.play() }
  }
}
`,
    validate: `  if (typeof url !== 'string' || !url) throw new Error('VideoPlayer url must be a non-empty string')`,
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
      { prop: 'onPickError', event: 'PickError', payload: { message: 'string' } },
    ],
    fields: {
      ...commonFields,
      systemImage: { type: 'string', default: '' },
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
      Task { @MainActor in
        do {
          guard let data = try await item.loadTransferable(type: Data.self) else {
            model.pickError("the picked item carries no data")
            return
          }
          let url = try write(data, named: item.supportedContentTypes.first?.preferredFilenameExtension ?? "dat")
          model.pick(url.absoluteString, Double(index), Double(count))
        } catch {
          model.pickError(error.localizedDescription)
        }
      }
    }
  }
  // the caller gets a file it can read, so the bytes land in the temporary directory under a
  // fresh name. the system clears that directory; nothing here deletes the file.
  private func write(_ data: Data, named ext: String) throws -> URL {
    let url = FileManager.default.temporaryDirectory
      .appendingPathComponent("one-native-photo-\\(UUID().uuidString)")
      .appendingPathExtension(ext)
    try data.write(to: url)
    return url
  }
}
`,
    validate: `  if (typeof label !== 'string' || !label) throw new Error('PhotosPicker label must be a non-empty string')
  if (!Number.isInteger(maxSelectionCount) || maxSelectionCount < 0) throw new Error('PhotosPicker maxSelectionCount must be a nonnegative integer; 0 is unlimited')
  if (!['any', 'images', 'videos', 'livePhotos', 'screenshots', 'screenRecordings', 'slomoVideos', 'timelapseVideos', 'cinematicVideos', 'depthEffectPhotos', 'bursts', 'panoramas'].includes(filter)) throw new Error('Unknown PhotosPicker filter: ' + filter)`,
  },
  {
    // WebView is iOS 26 only, which is the package floor, so it needs no availability gate.
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
    ],
    fields: {
      url: { type: 'string', default: '' },
      // markup the app already holds, loaded through WebPage.load(html:) rather than
      // fetched. exclusive with url.
      html: { type: 'string', default: '' },
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
    swift: `WebViewSurface(model: model)
      .oneNativeWebViewBackForwardNavigationGestures(model.backForwardNavigationGestures)
      .oneNativeWebViewMagnificationGestures(model.magnificationGestures)
      .oneNativeWebViewLinkPreviews(model.linkPreviews)
      .oneNativeWebViewElementFullscreenBehavior(model.elementFullscreen)
      .oneNativeWebViewContentBackground(model.contentBackground)`,
    extraSwift: `// WebPage owns the loaded page and its back-forward list. it is built on appear rather
// than in a State initializer, which SwiftUI re-runs every time this view is rebuilt, and
// it is told to load only when the url actually changes: reloading on any other prop would
// throw away the scroll position and the history.
@MainActor private struct WebViewSurface: View {
  @ObservedObject var model: WebViewModel
  @State private var page: WebPage?
  @State private var loaded: String?
  // url and html are one source with two spellings, so the prefix keeps a url and a piece
  // of markup that happen to be the same string from counting as the same load.
  private var source: String { model.html.isEmpty ? "url:" + model.url : "html:" + model.html }
  var body: some View {
    Group {
      if let page {
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
      }
    }
    .onAppear { load() }
    .onChange(of: model.url) { load() }
    .onChange(of: model.html) { load() }
  }
  private func load() {
    if page == nil { page = WebPage() }
    guard loaded != source else { return }
    loaded = source
    guard let page else { return }
    if model.html.isEmpty {
      guard let url = URL(string: model.url) else { return }
      page.load(url)
    } else {
      page.load(html: model.html)
    }
  }
}
`,
    validate: `  if (!url === !html) throw new Error('WebView takes exactly one of url and html')`,
  },
]
