import {
  actionButtons,
  actionsField,
  actionsValidate,
  type Control,
  type ModifierSelector,
} from './controlTypes'

const dialogFields = {
  title: { type: 'string', default: '' },
  message: { type: 'string', default: '' },
  presenting: {
    type: 'string',
    default: '',
    jsDefault: 'undefined',
    nativeValue: 'presenting ?? ""',
  },
  hasPresenting: {
    type: 'boolean',
    default: false,
    derived: true,
    nativeValue: 'presenting !== undefined',
  },
  actions: actionsField,
} as const

// the buttons live inside the presented dialog, so the host must not carry a `disabled`
// field: SwiftUI's .disabled propagates through the environment into the actions. a dialog
// with no buttons cannot be dismissed, which the empty state does not share.
const dialogValidate = (name: string) =>
  `${actionsValidate(name)}
  if (presenting !== undefined && typeof presenting !== 'string') throw new Error('${name} presenting must be a string')
  if (!actions.length) throw new Error('${name} must have at least one action')`

const dialogButtons = (presenting: string) => actionButtons('        ', `, ${presenting}`)

const viewRequirements = ['A : SwiftUICore.View', 'M : SwiftUICore.View']
const dialogModifier = (
  name: string,
  extra: readonly { label: string; type: string }[],
  presenting = false
): ModifierSelector => ({
  name,
  parameters: [
    { label: '_', type: 'SwiftUICore.LocalizedStringKey' },
    { label: 'isPresented', type: 'SwiftUICore.Binding<Swift.Bool>' },
    ...extra,
    ...(presenting ? [{ label: 'presenting', type: 'T?' }] : []),
    { label: 'actions', type: presenting ? '(T) -> A' : '() -> A' },
    { label: 'message', type: presenting ? '(T) -> M' : '() -> M' },
  ],
  requirements: viewRequirements,
})

export const presentationControls: Control[] = [
  {
    name: 'Alert',
    value: {
      type: 'boolean',
      prop: 'isPresented',
      event: 'onIsPresentedChange',
      initial: false,
    },
    actions: [
      {
        prop: 'onAction',
        event: 'Action',
        payload: { id: 'string', presenting: 'string' },
      },
    ],
    fields: dialogFields,
    constructors: [],
    methods: [dialogModifier('alert', []), dialogModifier('alert', [], true)],
    swift: `Group {
      if !model.hasPresenting {
      Color.clear
        .alert(LocalizedStringKey(model.title), isPresented: Binding(
          get: { model.controlled.value },
          set: { value in model.change(value) }
        )) {
${dialogButtons('""')}
        } message: {
          if !model.message.isEmpty { Text(model.message) }
        }
    } else {
      Color.clear
        .alert(LocalizedStringKey(model.title), isPresented: Binding(
          get: { model.controlled.value },
          set: { value in model.change(value) }
        ), presenting: model.presenting) { presenting in
${dialogButtons('presenting')}
        } message: { _ in
          if !model.message.isEmpty { Text(model.message) }
        }
      }
    }`,
    validate: dialogValidate('Alert'),
    layout: 'presentation',
  },
  {
    name: 'ConfirmationDialog',
    value: {
      type: 'boolean',
      prop: 'isPresented',
      event: 'onIsPresentedChange',
      initial: false,
    },
    actions: [
      {
        prop: 'onAction',
        event: 'Action',
        payload: { id: 'string', presenting: 'string' },
      },
    ],
    fields: {
      ...dialogFields,
      titleVisibility: { type: 'string', default: 'automatic', enum: 'Visibility' },
    },
    constructors: [],
    methods: [
      dialogModifier('confirmationDialog', [
        { label: 'titleVisibility', type: 'SwiftUICore.Visibility' },
      ]),
      dialogModifier(
        'confirmationDialog',
        [{ label: 'titleVisibility', type: 'SwiftUICore.Visibility' }],
        true
      ),
    ],
    swift: `Group {
      if !model.hasPresenting {
      Color.clear
        .confirmationDialog(LocalizedStringKey(model.title), isPresented: Binding(
          get: { model.controlled.value },
          set: { value in model.change(value) }
        ), titleVisibility: OneNativeGenerated.visibility(model.titleVisibility)) {
${dialogButtons('""')}
        } message: {
          if !model.message.isEmpty { Text(model.message) }
        }
    } else {
      Color.clear
        .confirmationDialog(LocalizedStringKey(model.title), isPresented: Binding(
          get: { model.controlled.value },
          set: { value in model.change(value) }
        ), titleVisibility: OneNativeGenerated.visibility(model.titleVisibility),
          presenting: model.presenting) { presenting in
${dialogButtons('presenting')}
        } message: { _ in
          if !model.message.isEmpty { Text(model.message) }
        }
      }
    }`,
    validate: dialogValidate('ConfirmationDialog'),
    layout: 'presentation',
  },
  {
    name: 'QuickLook',
    imports: ['QuickLook', 'Foundation', 'ImageIO'],
    value: {
      type: 'boolean',
      prop: 'isPresented',
      event: 'onIsPresentedChange',
      initial: false,
    },
    actions: [{ prop: 'onError', event: 'Error', payload: { message: 'string' } }],
    fields: {
      url: { type: 'string', default: '' },
      items: {
        type: 'objects',
        default: '',
        jsDefault: '[]',
        payload: {
          name: 'QuickLookItem',
          element: { url: 'string', title: 'string', sourceIdentifier: 'string' },
          optional: ['title', 'sourceIdentifier'],
        },
      },
      initialIndex: { type: 'Double', default: 0 },
    },
    constructors: [],
    swift: `QuickLookSurface(model: model)`,
    extraSwift: `private struct QuickLookSurface: UIViewControllerRepresentable {
  @ObservedObject var model: QuickLookModel
  func makeCoordinator() -> Coordinator { Coordinator(model) }
  func makeUIViewController(context: Context) -> Anchor {
    let anchor = Anchor()
    anchor.onAppear = { [weak coordinator = context.coordinator, weak anchor] in
      if let anchor { coordinator?.update(anchor) }
    }
    return anchor
  }
  func updateUIViewController(_ anchor: Anchor, context: Context) {
    context.coordinator.update(anchor)
  }
  static func dismantleUIViewController(_ anchor: Anchor, coordinator: Coordinator) {
    coordinator.stop()
  }

  final class Anchor: UIViewController {
    var onAppear: (() -> Void)?
    override func viewDidAppear(_ animated: Bool) {
      super.viewDidAppear(animated)
      onAppear?()
    }
  }

  final class Item: NSObject, QLPreviewItem {
    let url: URL
    let title: String
    var previewItemURL: URL? { url }
    var previewItemTitle: String? { title }
    let sourceIdentifier: String
    init(_ url: URL, title: String, sourceIdentifier: String) {
      self.url = url
      self.title = title.isEmpty ? url.lastPathComponent : title
      self.sourceIdentifier = sourceIdentifier
    }
  }

  final class Page: UIViewController, UIScrollViewDelegate, QLPreviewControllerDataSource {
    let item: Item
    let index: Int
    let image: UIImage?
    let scroll = UIScrollView()
    let imageView = UIImageView()
    var viewport = CGSize.zero

    init(_ item: Item, index: Int) {
      self.item = item
      self.index = index
      if let source = CGImageSourceCreateWithURL(item.url as CFURL, nil), CGImageSourceGetCount(source) == 1 {
        image = UIImage(contentsOfFile: item.url.path)
      } else {
        image = nil
      }
      super.init(nibName: nil, bundle: nil)
    }
    required init?(coder: NSCoder) { fatalError("init(coder:) is unavailable") }
    override func viewDidLoad() {
      super.viewDidLoad()
      view.backgroundColor = .black
      if let image {
        scroll.delegate = self
        scroll.showsHorizontalScrollIndicator = false
        scroll.showsVerticalScrollIndicator = false
        scroll.contentInsetAdjustmentBehavior = .never
        scroll.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(scroll)
        NSLayoutConstraint.activate([
          scroll.leadingAnchor.constraint(equalTo: view.leadingAnchor),
          scroll.trailingAnchor.constraint(equalTo: view.trailingAnchor),
          scroll.topAnchor.constraint(equalTo: view.topAnchor),
          scroll.bottomAnchor.constraint(equalTo: view.bottomAnchor),
        ])
        imageView.image = image
        imageView.frame = CGRect(origin: .zero, size: image.size)
        imageView.isAccessibilityElement = true
        imageView.accessibilityLabel = item.title
        imageView.accessibilityIdentifier = "one-media-viewer-image"
        scroll.addSubview(imageView)
        let doubleTap = UITapGestureRecognizer(target: self, action: #selector(zoom(_:)))
        doubleTap.numberOfTapsRequired = 2
        scroll.addGestureRecognizer(doubleTap)
      } else {
        let document = QLPreviewController()
        document.dataSource = self
        addChild(document)
        document.view.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(document.view)
        NSLayoutConstraint.activate([
          document.view.leadingAnchor.constraint(equalTo: view.leadingAnchor),
          document.view.trailingAnchor.constraint(equalTo: view.trailingAnchor),
          document.view.topAnchor.constraint(equalTo: view.topAnchor),
          document.view.bottomAnchor.constraint(equalTo: view.bottomAnchor),
        ])
        document.didMove(toParent: self)
      }
    }
    override func viewDidLayoutSubviews() {
      super.viewDidLayoutSubviews()
      guard let image, scroll.bounds.size != viewport, scroll.bounds.width > 0, scroll.bounds.height > 0 else { return }
      viewport = scroll.bounds.size
      let fit = min(viewport.width / image.size.width, viewport.height / image.size.height)
      scroll.zoomScale = 1
      imageView.frame = CGRect(origin: .zero, size: CGSize(width: image.size.width * fit, height: image.size.height * fit))
      scroll.contentSize = imageView.bounds.size
      scroll.minimumZoomScale = 1
      scroll.maximumZoomScale = 5
      centerImage()
    }
    func viewForZooming(in scrollView: UIScrollView) -> UIView? { imageView }
    func scrollViewDidZoom(_ scrollView: UIScrollView) { centerImage() }
    func centerImage() {
      scroll.contentInset = UIEdgeInsets(
        top: max(0, (scroll.bounds.height - scroll.contentSize.height) / 2),
        left: max(0, (scroll.bounds.width - scroll.contentSize.width) / 2),
        bottom: 0, right: 0
      )
    }
    @objc func zoom(_ gesture: UITapGestureRecognizer) {
      if scroll.zoomScale > scroll.minimumZoomScale {
        scroll.setZoomScale(scroll.minimumZoomScale, animated: true)
      } else {
        let location = gesture.location(in: imageView)
        let scale = scroll.minimumZoomScale * 2
        let size = CGSize(width: scroll.bounds.width / scale, height: scroll.bounds.height / scale)
        scroll.zoom(to: CGRect(x: location.x - size.width / 2, y: location.y - size.height / 2, width: size.width, height: size.height), animated: true)
      }
    }
    func numberOfPreviewItems(in controller: QLPreviewController) -> Int { 1 }
    func previewController(_ controller: QLPreviewController, previewItemAt index: Int) -> QLPreviewItem { item }
  }

  final class Viewer: UIViewController, UIPageViewControllerDataSource, UIPageViewControllerDelegate {
    let items: [Item]
    var index: Int
    var onDismiss: (() -> Void)?
    let pages = UIPageViewController(transitionStyle: .scroll, navigationOrientation: .horizontal)
    let bar = UINavigationBar()
    let barItem = UINavigationItem()
    lazy var shareButton = UIBarButtonItem(barButtonSystemItem: .action, target: self, action: #selector(share))
    var page: Page { pages.viewControllers![0] as! Page }

    init(items: [Item], index: Int) {
      self.items = items
      self.index = index
      super.init(nibName: nil, bundle: nil)
      modalPresentationStyle = .fullScreen
      overrideUserInterfaceStyle = .dark
      if #available(iOS 18.0, *) {
        let options = UIViewController.Transition.ZoomOptions()
        options.alignmentRectProvider = { [weak self] context in
          guard let self, self.isViewLoaded else { return nil }
          let page = self.page
          let target = page.image == nil ? page.view! : page.imageView
          return target.convert(target.bounds, to: context.zoomedViewController.view)
        }
        options.interactiveDismissShouldBegin = { [weak self] context in
          guard let self, self.isViewLoaded else { return context.willBegin }
          return self.page.image == nil || self.page.scroll.zoomScale <= self.page.scroll.minimumZoomScale
        }
        preferredTransition = .zoom(options: options) { [weak self] _ in
          guard let self else { return nil }
          return OneZoomManager.shared.sourceRepository.getSource(identifier: self.items[self.index].sourceIdentifier)?.view
        }
      }
    }
    required init?(coder: NSCoder) { fatalError("init(coder:) is unavailable") }
    override var preferredStatusBarStyle: UIStatusBarStyle { .lightContent }
    override func viewDidLoad() {
      super.viewDidLoad()
      view.backgroundColor = .black
      view.accessibilityIdentifier = "OneMediaViewerView"
      bar.translatesAutoresizingMaskIntoConstraints = false
      let appearance = UINavigationBarAppearance()
      appearance.configureWithTransparentBackground()
      bar.standardAppearance = appearance
      bar.scrollEdgeAppearance = appearance
      barItem.title = items[index].title
      barItem.leftBarButtonItem = UIBarButtonItem(barButtonSystemItem: .close, target: self, action: #selector(close))
      barItem.leftBarButtonItem?.accessibilityIdentifier = "one-media-viewer-close"
      shareButton.accessibilityIdentifier = "one-media-viewer-share"
      barItem.rightBarButtonItem = shareButton
      bar.items = [barItem]
      view.addSubview(bar)
      pages.dataSource = self
      pages.delegate = self
      pages.setViewControllers([Page(items[index], index: index)], direction: .forward, animated: false)
      addChild(pages)
      pages.view.translatesAutoresizingMaskIntoConstraints = false
      view.addSubview(pages.view)
      NSLayoutConstraint.activate([
        bar.leadingAnchor.constraint(equalTo: view.leadingAnchor),
        bar.trailingAnchor.constraint(equalTo: view.trailingAnchor),
        bar.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
        bar.heightAnchor.constraint(equalToConstant: 44),
        pages.view.leadingAnchor.constraint(equalTo: view.leadingAnchor),
        pages.view.trailingAnchor.constraint(equalTo: view.trailingAnchor),
        pages.view.topAnchor.constraint(equalTo: bar.bottomAnchor),
        pages.view.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor),
      ])
      pages.didMove(toParent: self)
    }
    override func viewDidDisappear(_ animated: Bool) {
      super.viewDidDisappear(animated)
      if isBeingDismissed || presentingViewController == nil { onDismiss?() }
    }
    @objc func close() { dismiss(animated: true) { [weak self] in self?.onDismiss?() } }
    @objc func share() {
      let sheet = UIActivityViewController(activityItems: [items[index].url], applicationActivities: nil)
      sheet.popoverPresentationController?.barButtonItem = shareButton
      present(sheet, animated: true)
    }
    func pageViewController(_ pageViewController: UIPageViewController, viewControllerBefore controller: UIViewController) -> UIViewController? {
      let previous = (controller as! Page).index - 1
      return items.indices.contains(previous) ? Page(items[previous], index: previous) : nil
    }
    func pageViewController(_ pageViewController: UIPageViewController, viewControllerAfter controller: UIViewController) -> UIViewController? {
      let next = (controller as! Page).index + 1
      return items.indices.contains(next) ? Page(items[next], index: next) : nil
    }
    func pageViewController(_ pageViewController: UIPageViewController, didFinishAnimating finished: Bool, previousViewControllers: [UIViewController], transitionCompleted completed: Bool) {
      guard completed else { return }
      index = page.index
      barItem.title = items[index].title
    }
  }

  final class Coordinator {
    let model: QuickLookModel
    var preview: Viewer?
    var loading: Task<Void, Never>?
    var items: [Item] = []
    var directory: URL?
    var dismissing = false
    var request = UUID()
    init(_ model: QuickLookModel) { self.model = model }

    func update(_ anchor: Anchor) {
      guard model.controlled.value else { stop(); return }
      guard anchor.viewIfLoaded?.window != nil, preview == nil, loading == nil, !dismissing else { return }
      let sources = model.items.isEmpty
        ? [(url: model.url, title: "", sourceIdentifier: "")]
        : model.items.map { (url: $0.url, title: $0.title, sourceIdentifier: $0.sourceIdentifier) }
      let initialIndex = Int(model.initialIndex)
      let request = UUID()
      self.request = request
      loading = Task { @MainActor [weak self, weak anchor] in
        guard let self, let anchor else { return }
        let folder = FileManager.default.temporaryDirectory.appendingPathComponent("one-preview-" + UUID().uuidString)
        do {
          try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
          var resolved: [Item] = []
          for (index, source) in sources.enumerated() {
            try Task.checkCancellation()
            guard let url = URL(string: source.url) else {
              throw NSError(domain: "One.QuickLook", code: 3, userInfo: [NSLocalizedDescriptionKey: "Invalid preview URL."])
            }
            let local: URL
            if url.isFileURL {
              local = url
            } else {
              let (temporary, response) = try await URLSession.shared.download(from: url)
              guard let response = response as? HTTPURLResponse, (200..<300).contains(response.statusCode) else {
                throw NSError(domain: "One.QuickLook", code: 1, userInfo: [NSLocalizedDescriptionKey: "The preview could not be downloaded."])
              }
              try Task.checkCancellation()
              let page = folder.appendingPathComponent(String(index))
              try FileManager.default.createDirectory(at: page, withIntermediateDirectories: true)
              let name = source.title.isEmpty ? (response.suggestedFilename ?? url.lastPathComponent) : source.title
              var destination = page.appendingPathComponent(URL(fileURLWithPath: name).lastPathComponent)
              if destination.pathExtension.isEmpty {
                let ext = url.pathExtension.isEmpty ? URL(fileURLWithPath: response.suggestedFilename ?? "").pathExtension : url.pathExtension
                if !ext.isEmpty { destination.appendPathExtension(ext) }
              }
              try FileManager.default.moveItem(at: temporary, to: destination)
              local = destination
            }
            guard FileManager.default.isReadableFile(atPath: local.path), QLPreviewController.canPreview(local as NSURL) else {
              throw NSError(domain: "One.QuickLook", code: 2, userInfo: [NSLocalizedDescriptionKey: "This file cannot be previewed."])
            }
            resolved.append(Item(local, title: source.title, sourceIdentifier: source.sourceIdentifier))
          }
          try Task.checkCancellation()
          guard self.request == request, model.active, model.controlled.value, anchor.viewIfLoaded?.window != nil else {
            try? FileManager.default.removeItem(at: folder)
            if self.request == request { loading = nil }
            return
          }
          directory = folder
          items = resolved
          let controller = Viewer(items: resolved, index: initialIndex)
          controller.onDismiss = { [weak self, weak controller] in
            if let controller { self?.finish(controller) }
          }
          controller.loadViewIfNeeded()
          controller.view.frame = anchor.view.window!.bounds
          controller.view.layoutIfNeeded()
          preview = controller
          loading = nil
          anchor.present(controller, animated: true)
        } catch {
          let cancelled = Task.isCancelled
          try? FileManager.default.removeItem(at: folder)
          guard self.request == request else { return }
          loading = nil
          if !cancelled {
            model.error(error.localizedDescription)
            model.change(false)
          }
        }
      }
    }

    func finish(_ controller: Viewer) {
      guard preview === controller else { return }
      preview = nil
      dismissing = false
      cleanup()
      model.change(false)
    }
    func stop() {
      request = UUID()
      loading?.cancel()
      loading = nil
      guard !dismissing else { return }
      guard let controller = preview else { cleanup(); return }
      dismissing = true
      controller.dismiss(animated: true) { [self] in finish(controller) }
    }
    func cleanup() {
      items = []
      if let directory { try? FileManager.default.removeItem(at: directory) }
      directory = nil
    }
  }
}
`,
    validate: `  if (isPresented || items.length || url) {
  const sources = items.length ? items : [{ url }]
  for (const item of sources) {
    if (typeof item.url !== 'string' || !['file://', 'http://', 'https://'].some(prefix => item.url.startsWith(prefix))) throw new Error('QuickLook items must use file, http, or https URLs')
    if (item.title !== undefined && typeof item.title !== 'string') throw new Error('QuickLook item title must be a string')
    if (item.sourceIdentifier !== undefined && typeof item.sourceIdentifier !== 'string') throw new Error('QuickLook sourceIdentifier must be a string')
  }
  if (!Number.isInteger(initialIndex) || initialIndex < 0 || initialIndex >= sources.length) throw new Error('QuickLook initialIndex must name an item')
  }`,
    layout: 'presentation',
  },
  {
    // fileImporter as a zero-size host like Alert: React flips isPresented, each
    // pick reports through onCompletion and backing out through onCancellation.
    // every pick is copied into Caches before reporting, since the security-scoped
    // url dies with the picker and was never readable from JS.
    name: 'FileImporter',
    imports: ['UniformTypeIdentifiers', 'Foundation'],
    value: {
      type: 'boolean',
      prop: 'isPresented',
      event: 'onIsPresentedChange',
      initial: false,
    },
    actions: [
      {
        prop: 'onCompletion',
        event: 'Completion',
        payload: {
          type: 'string',
          url: 'string',
          index: 'Double',
          count: 'Double',
          message: 'string',
        },
        object: {
          variants: [
            { type: 'success', fields: ['url', 'index', 'count'] },
            { type: 'failed', fields: ['message'] },
            { type: 'cancelled', fields: [] },
          ],
        },
      },
    ],
    fields: {
      allowedContentTypes: { type: 'strings', default: [] },
      allowsMultipleSelection: { type: 'boolean', default: false },
    },
    constructors: [],
    methods: [
      {
        name: 'fileImporter',
        parameters: [
          { label: 'isPresented', type: 'SwiftUICore.Binding<Swift.Bool>' },
          { label: 'allowedContentTypes', type: '[UniformTypeIdentifiers.UTType]' },
          { label: 'allowsMultipleSelection', type: 'Swift.Bool' },
          {
            label: 'onCompletion',
            type: '@escaping (_ result: Swift.Result<[Foundation.URL], any Swift.Error>) -> Swift.Void',
          },
          { label: 'onCancellation', type: '@escaping () -> Swift.Void' },
        ],
        requirements: [],
      },
    ],
    setBody: {
      allowedContentTypes: `let resolved = items.compactMap(UTType.init)
    if !items.isEmpty && resolved.isEmpty {
      model.completion("failed", "", 0, 0, "unknown content type identifiers: \\(items.joined(separator: ", "))")
      return
    }
    if model.allowedContentTypes != items { model.allowedContentTypes = items }`,
    },
    swift: `FileImporterSurface(model: model)`,
    extraSwift: `// UTType identifiers are an open set, so they travel as strings and resolve here.
// only an empty list means the unrestricted import, UTType.item, the base of
// every pickable type. a non-empty list that resolves to nothing never reaches
// this fallback: the setter rejects it with a failed completion instead.
private func oneNativeContentTypes(_ identifiers: [String]) -> [UTType] {
  let resolved = identifiers.compactMap { UTType($0) }
  return resolved.isEmpty ? [.item] : resolved
}

// the picker hands out security-scoped urls, which stop working once the picker goes
// away and were never readable from JS. each pick is copied under a fresh folder in
// Caches, keeping its filename, and the copy is what the event reports. Caches is the
// system's to purge; nothing here deletes the file. runs on a utility queue; the
// security-scoped access opens and closes on that same thread.
func oneNativeCopyToCaches(_ url: URL) throws -> URL {
  let accessing = url.startAccessingSecurityScopedResource()
  defer { if accessing { url.stopAccessingSecurityScopedResource() } }
  let folder = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0]
    .appendingPathComponent("one-native-file-importer", isDirectory: true)
    .appendingPathComponent(UUID().uuidString, isDirectory: true)
  try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
  let name = url.lastPathComponent.isEmpty ? "file" : url.lastPathComponent
  let destination = folder.appendingPathComponent(name)
  try FileManager.default.copyItem(at: url, to: destination)
  return destination
}

private struct FileImporterSurface: View {
  @ObservedObject var model: FileImporterModel
  var body: some View {
    Color.clear
      .fileImporter(
        isPresented: Binding(
          get: { model.controlled.value },
          set: { value in model.change(value) }
        ),
        allowedContentTypes: oneNativeContentTypes(model.allowedContentTypes),
        allowsMultipleSelection: model.allowsMultipleSelection
      ) { result in
        switch result {
        case .success(let urls):
          // backing out routes to onCancellation, never here, so an empty
          // success cannot arrive; the guard only satisfies the type.
          guard !urls.isEmpty else { return }
          let count = urls.count
          DispatchQueue.global(qos: .utility).async {
            var outcomes: [(Int, String, String)] = []
            outcomes.reserveCapacity(urls.count)
            for (index, url) in urls.enumerated() {
              do {
                let copy = try oneNativeCopyToCaches(url)
                outcomes.append((index, copy.absoluteString, ""))
              } catch {
                outcomes.append((index, "", error.localizedDescription))
              }
            }
            DispatchQueue.main.async {
              for (index, urlString, message) in outcomes {
                if message.isEmpty {
                  model.completion("success", urlString, Double(index), Double(count), "")
                } else {
                  model.completion("failed", "", Double(index), Double(count), message)
                }
              }
            }
          }
        case .failure(let error):
          model.completion("failed", "", 0, 0, error.localizedDescription)
        }
      } onCancellation: {
        model.completion("cancelled", "", 0, 0, "")
      }
  }
}
`,
    validate: `  if (!Array.isArray(allowedContentTypes)) throw new Error('FileImporter allowedContentTypes must be an array')
  for (const identifier of allowedContentTypes) {
    if (typeof identifier !== 'string' || !identifier) throw new Error('FileImporter content types must be non-empty UTType identifier strings')
  }
  if (typeof allowsMultipleSelection !== 'boolean') throw new Error('FileImporter allowsMultipleSelection must be a boolean')`,
    layout: 'presentation',
  },
]
