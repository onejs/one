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
    // fileImporter as a zero-size host like Alert: React flips isPresented, the picker
    // reports each pick through onCompletion and dismissal through the binding. every
    // pick is copied into Caches before reporting, since the security-scoped url dies
    // with the picker and was never readable from JS.
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
        payload: { url: 'string', index: 'Double', count: 'Double', message: 'string' },
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
        ],
        requirements: [],
      },
    ],
    swift: `FileImporterSurface(model: model)`,
    extraSwift: `// UTType identifiers are an open set, so they travel as strings and resolve here.
// identifiers the registry does not know are dropped; an empty resolution is the
 // unrestricted import, which is UTType.item, the base of every pickable type.
private func oneNativeContentTypes(_ identifiers: [String]) -> [UTType] {
  let resolved = identifiers.compactMap { UTType($0) }
  return resolved.isEmpty ? [.item] : resolved
}

// the picker hands out security-scoped urls, which stop working once the picker goes
// away and were never readable from JS. each pick is copied under a fresh folder in
// Caches, keeping its filename, and the copy is what the event reports. Caches is the
// system's to purge; nothing here deletes the file.
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

// backing out of the picker never calls the result closure on current iOS: the
// binding flipping to false is the only signal. but on a pick the binding
// flips ~2ms BEFORE the result arrives, so a dismissal cannot report cancel
// synchronously. instead it schedules the cancelled completion past a grace
// window, and a result that lands first disarms it; the generation guards a
// re-present inside the window. when another iOS does call the closure for a
// cancel, the arrival flag disarms the timer the same way, so each dismissal
// reports exactly one cancelled completion either way.
private final class FileImporterDismissalTracker: ObservableObject {
  var presentationId = 0
  var resultArrived = false
}

private struct FileImporterSurface: View {
  @ObservedObject var model: FileImporterModel
  @StateObject private var dismissal = FileImporterDismissalTracker()
  var body: some View {
    Color.clear
      .fileImporter(
        isPresented: Binding(
          get: { model.controlled.value },
          set: { value in
            model.change(value)
            if value {
              dismissal.presentationId += 1
              dismissal.resultArrived = false
            } else if !dismissal.resultArrived {
              let id = dismissal.presentationId
              DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) {
                guard dismissal.presentationId == id, !dismissal.resultArrived else { return }
                model.completion("", 0, 0, "cancelled")
              }
            }
          }
        ),
        allowedContentTypes: oneNativeContentTypes(model.allowedContentTypes),
        allowsMultipleSelection: model.allowsMultipleSelection
      ) { result in
        dismissal.resultArrived = true
        switch result {
        case .success(let urls):
          // an empty success is the cancelled completion on iOS versions that
          // report backing out this way; a real pick always carries a url.
          if urls.isEmpty {
            model.completion("", 0, 0, "cancelled")
          } else {
            let count = urls.count
            for (index, url) in urls.enumerated() {
              do {
                let copy = try oneNativeCopyToCaches(url)
                model.completion(copy.absoluteString, Double(index), Double(count), "")
              } catch {
                model.completion("", Double(index), Double(count), error.localizedDescription)
              }
            }
          }
        case .failure(let error):
          let nsError = error as NSError
          if nsError.domain == NSCocoaErrorDomain, nsError.code == NSUserCancelledError {
            model.completion("", 0, 0, "cancelled")
          } else {
            model.completion("", 0, 0, error.localizedDescription)
          }
        }
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
