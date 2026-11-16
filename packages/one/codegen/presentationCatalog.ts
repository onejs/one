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
    imports: ['QuickLook', 'Foundation'],
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
    let previewItemURL: URL?
    let previewItemTitle: String?
    let sourceIdentifier: String
    init(_ url: URL, title: String, sourceIdentifier: String) {
      previewItemURL = url
      previewItemTitle = title.isEmpty ? url.lastPathComponent : title
      self.sourceIdentifier = sourceIdentifier
    }
  }

  final class Coordinator: NSObject, QLPreviewControllerDataSource, QLPreviewControllerDelegate {
    let model: QuickLookModel
    var preview: QLPreviewController?
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
          let controller = QLPreviewController()
          controller.dataSource = self
          controller.delegate = self
          controller.currentPreviewItemIndex = initialIndex
          controller.modalPresentationStyle = .fullScreen
          if #available(iOS 18.0, *) {
            controller.preferredTransition = .zoom { [weak self] _ in
              guard let self, let preview = self.preview, self.items.indices.contains(preview.currentPreviewItemIndex) else { return nil }
              let identifier = self.items[preview.currentPreviewItemIndex].sourceIdentifier
              let view = OneZoomManager.shared.sourceRepository.getSource(identifier: identifier)?.view
              return view?.window == nil ? nil : view
            }
          }
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

    func numberOfPreviewItems(in controller: QLPreviewController) -> Int { items.count }
    func previewController(_ controller: QLPreviewController, previewItemAt index: Int) -> QLPreviewItem { items[index] }
    func previewControllerDidDismiss(_ controller: QLPreviewController) {
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
      controller.dismiss(animated: true) { [self] in
        preview = nil
        dismissing = false
        cleanup()
      }
    }
    func cleanup() {
      items = []
      if let directory { try? FileManager.default.removeItem(at: directory) }
      directory = nil
    }
  }
}
`,
    validate: `  const sources = items.length ? items : [{ url }]
  for (const item of sources) {
    if (typeof item.url !== 'string' || !['file://', 'http://', 'https://'].some(prefix => item.url.startsWith(prefix))) throw new Error('QuickLook items must use file, http, or https URLs')
    if (item.title !== undefined && typeof item.title !== 'string') throw new Error('QuickLook item title must be a string')
    if (item.sourceIdentifier !== undefined && typeof item.sourceIdentifier !== 'string') throw new Error('QuickLook sourceIdentifier must be a string')
  }
  if (!Number.isInteger(initialIndex) || initialIndex < 0 || initialIndex >= sources.length) throw new Error('QuickLook initialIndex must name an item')`,
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
