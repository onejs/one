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
    // from _QuickLook_SwiftUI, one of the overlay modules. QLPreviewController previews a
    // local file. release assets already resolve to file urls; dev-server assets are
    // downloaded to a temporary file by the generated surface before presentation.
    name: 'QuickLook',
    // importing QuickLook alongside SwiftUI is what loads the _QuickLook_SwiftUI overlay.
    imports: ['QuickLook', 'Foundation'],
    value: {
      type: 'boolean',
      prop: 'isPresented',
      event: 'onIsPresentedChange',
      initial: false,
    },
    fields: { url: { type: 'string', default: '' } },
    constructors: [],
    methods: [
      {
        name: 'quickLookPreview',
        parameters: [{ label: '_', type: 'SwiftUICore.Binding<Foundation.URL?>' }],
        requirements: [],
      },
    ],
    // the SDK binds the previewed item, not a boolean: a nil url is the dismissed state, so
    // presenting means handing it one and dismissal comes back as nil.
    swift: `QuickLookSurface(model: model)`,
    extraSwift: `private struct QuickLookSurface: View {
  @ObservedObject var model: QuickLookModel
  @State private var resolvedURL: URL?
  var body: some View {
    Color.clear
      .quickLookPreview(Binding(
        get: { model.controlled.value ? resolvedURL : nil },
        set: { value in
          if value == nil, resolvedURL != nil { model.change(false) }
        }
      ))
      .task(id: model.url) {
        let previous = resolvedURL
        resolvedURL = await oneNativeQuickLookURL(model.url)
        oneNativeRemoveQuickLookURL(previous)
      }
      .onDisappear {
        oneNativeRemoveQuickLookURL(resolvedURL)
        resolvedURL = nil
      }
  }
}

private let oneNativeQuickLookPrefix = "one-native-quick-look-"

private func oneNativeQuickLookURL(_ source: String) async -> URL? {
  guard let url = URL(string: source) else { return nil }
  if url.isFileURL { return url }
  guard url.scheme == "http" || url.scheme == "https" else { return nil }
  do {
    let (temporary, response) = try await URLSession.shared.download(from: url)
    let suggested = response.suggestedFilename.flatMap { URL(fileURLWithPath: $0).pathExtension }
    let pathExtension = url.pathExtension.isEmpty ? (suggested ?? "") : url.pathExtension
    var destination = FileManager.default.temporaryDirectory
      .appendingPathComponent(oneNativeQuickLookPrefix + UUID().uuidString)
    if !pathExtension.isEmpty { destination.appendPathExtension(pathExtension) }
    try FileManager.default.moveItem(at: temporary, to: destination)
    return destination
  } catch {
    return nil
  }
}

private func oneNativeRemoveQuickLookURL(_ url: URL?) {
  guard let url, url.isFileURL, url.lastPathComponent.hasPrefix(oneNativeQuickLookPrefix) else {
    return
  }
  try? FileManager.default.removeItem(at: url)
}
`,
    validate: `  if (typeof url !== 'string' || !url) throw new Error('QuickLook url must be a non-empty string')
  if (!url.startsWith('file://') && !url.startsWith('http://') && !url.startsWith('https://')) throw new Error('QuickLook url must use file, http, or https')`,
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
private func oneNativeCopyToCaches(_ url: URL) throws -> URL {
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
