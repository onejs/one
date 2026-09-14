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
    // local file, so the url is a file:// one, which is what expo-file-system hands back.
    name: 'QuickLook',
    // importing QuickLook alongside SwiftUI is what loads the _QuickLook_SwiftUI overlay.
    imports: ['QuickLook'],
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
    swift: `Color.clear
      .quickLookPreview(Binding(
        get: { model.controlled.value ? URL(string: model.url) : nil },
        set: { value in model.change(value != nil) }
      ))`,
    validate: `  if (typeof url !== 'string' || !url) throw new Error('QuickLook url must be a non-empty string')
  if (!url.startsWith('file://')) throw new Error('QuickLook url must be a file:// URL; Quick Look previews local files')`,
    layout: 'presentation',
  },
]
