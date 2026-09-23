// semantic mappings that the Swift declarations alone cannot determine.

// frameworks whose SwiftUI overlay declares modifiers or enum cases emitted below.
// importing the framework is what loads its _<Framework>_SwiftUI overlay, the same way a
// control declares `imports`.
export const frameworks = ['PhotosUI', 'WebKit'] as const

// native hosts with handwritten Fabric specs live outside SDK view generation.
export const handwrittenComponents = ['OneSwiftHost'] as const

export const modifiers = [
  { name: 'menuOrder', type: 'MenuOrder' },
  { name: 'presentationCompactAdaptation', type: 'PresentationAdaptation' },
  { name: 'presentationDragIndicator', type: 'Visibility', module: 'SwiftUICore' },
  { name: 'pickerStyle', type: 'PickerStyle' },
  { name: 'datePickerStyle', type: 'DatePickerStyle' },
  { name: 'toggleStyle', type: 'ToggleStyle' },
  {
    name: 'menuActionDismissBehavior',
    type: 'MenuActionDismissBehavior',
  },
  { name: 'controlGroupStyle', type: 'ControlGroupStyle' },
  { name: 'tabBarMinimizeBehavior', type: 'TabBarMinimizeBehavior' },
  { name: 'buttonStyle', type: 'PrimitiveButtonStyle' },
  { name: 'progressViewStyle', type: 'ProgressViewStyle' },
  { name: 'gaugeStyle', type: 'GaugeStyle' },
  { name: 'listStyle', type: 'ListStyle' },
  { name: 'textFieldStyle', type: 'TextFieldStyle' },
  { name: 'submitLabel', type: 'SubmitLabel' },
  {
    name: 'textInputAutocapitalization',
    type: 'TextInputAutocapitalization',
    optional: true,
  },
  {
    name: 'symbolRenderingMode',
    type: 'SymbolRenderingMode',
    module: 'SwiftUICore',
    optional: true,
  },
  {
    name: 'symbolVariant',
    type: 'SymbolVariants',
    module: 'SwiftUICore',
  },
  {
    name: 'imageScale',
    type: 'ImageScale',
    swiftType: 'Image.Scale',
    module: 'SwiftUICore',
  },
  {
    name: 'webViewBackForwardNavigationGestures',
    type: 'BackForwardNavigationGesturesBehavior',
    swiftType: 'WebView.BackForwardNavigationGesturesBehavior',
    module: '_WebKit_SwiftUI',
  },
  {
    name: 'webViewMagnificationGestures',
    type: 'MagnificationGesturesBehavior',
    swiftType: 'WebView.MagnificationGesturesBehavior',
    module: '_WebKit_SwiftUI',
  },
  {
    name: 'webViewLinkPreviews',
    type: 'LinkPreviewBehavior',
    swiftType: 'WebView.LinkPreviewBehavior',
    module: '_WebKit_SwiftUI',
  },
  {
    name: 'webViewElementFullscreenBehavior',
    type: 'ElementFullscreenBehavior',
    swiftType: 'WebView.ElementFullscreenBehavior',
    module: '_WebKit_SwiftUI',
  },
  { name: 'webViewContentBackground', type: 'Visibility', module: 'SwiftUICore' },
] as const

// a context menu is the same menu content on a different presentation, so Swift.Menu and
// Swift.ContextMenu are one component with one trigger slot.
export const menuMethods = [
  {
    name: 'contextMenu',
    parameters: [{ label: 'menuItems', type: '() -> MenuItems' }],
    requirements: ['MenuItems : SwiftUICore.View'],
  },
] as const
export const styleModifiers = [
  {
    name: 'font',
    parameters: [{ label: '_', type: 'SwiftUICore.Font?' }],
    requirements: [],
  },
  {
    name: 'foregroundStyle',
    parameters: [{ label: '_', type: 'S' }],
    requirements: ['S : SwiftUICore.ShapeStyle'],
  },
  {
    name: 'tint',
    parameters: [{ label: '_', type: 'SwiftUICore.Color?' }],
    requirements: [],
  },
  {
    name: 'padding',
    parameters: [{ label: '_', type: 'SwiftUICore.EdgeInsets' }],
    requirements: [],
  },
  {
    name: 'frame',
    parameters: [
      { label: 'minWidth', type: 'CoreFoundation.CGFloat?' },
      { label: 'idealWidth', type: 'CoreFoundation.CGFloat?' },
      { label: 'maxWidth', type: 'CoreFoundation.CGFloat?' },
      { label: 'minHeight', type: 'CoreFoundation.CGFloat?' },
      { label: 'idealHeight', type: 'CoreFoundation.CGFloat?' },
      { label: 'maxHeight', type: 'CoreFoundation.CGFloat?' },
      { label: 'alignment', type: 'SwiftUICore.Alignment' },
    ],
    requirements: [],
  },
  {
    name: 'background',
    parameters: [
      { label: '_', type: 'S' },
      { label: 'ignoresSafeAreaEdges', type: 'SwiftUICore.Edge.Set' },
    ],
    requirements: ['S : SwiftUICore.ShapeStyle'],
  },
  {
    name: 'clipShape',
    parameters: [
      { label: '_', type: 'S' },
      { label: 'style', type: 'SwiftUICore.FillStyle' },
    ],
    requirements: ['S : SwiftUICore.Shape'],
  },
  {
    name: 'opacity',
    parameters: [{ label: '_', type: 'Swift.Double' }],
    requirements: [],
  },
  {
    name: 'border',
    parameters: [
      { label: '_', type: 'S' },
      { label: 'width', type: 'CoreFoundation.CGFloat' },
    ],
    requirements: ['S : SwiftUICore.ShapeStyle'],
  },
] as const
export type StyleFieldKind = 'number' | 'string' | 'boolean' | 'color'

export interface StyleField {
  name: string
  kind: StyleFieldKind
  // a derived numeric or boolean modifier crosses Fabric as a string so its
  // absence, false, zero, and negative values stay distinct.
  publicType?: 'number' | 'boolean'
  derived?: true
  // the accepted values of a string field. the generated TypeScript alias and the Swift
  // resolver are built from this one list, so a value cannot exist in one and not the other.
  values?: readonly string[]
}

export const styleFields: readonly StyleField[] = [
  { name: 'fontSize', kind: 'number' },
  { name: 'fontWeight', kind: 'string' },
  { name: 'fontDesign', kind: 'string' },
  { name: 'textStyle', kind: 'string' },
  { name: 'foregroundStyle', kind: 'color' },
  { name: 'tint', kind: 'color' },
  { name: 'background', kind: 'color' },
  { name: 'padding', kind: 'number' },
  { name: 'paddingTop', kind: 'number' },
  { name: 'paddingLeading', kind: 'number' },
  { name: 'paddingBottom', kind: 'number' },
  { name: 'paddingTrailing', kind: 'number' },
  { name: 'width', kind: 'number' },
  { name: 'height', kind: 'number' },
  { name: 'minWidth', kind: 'number' },
  { name: 'idealWidth', kind: 'number' },
  { name: 'maxWidth', kind: 'number' },
  { name: 'minHeight', kind: 'number' },
  { name: 'idealHeight', kind: 'number' },
  { name: 'maxHeight', kind: 'number' },
  { name: 'cornerRadius', kind: 'number' },
  { name: 'opacity', kind: 'number' },
  { name: 'borderColor', kind: 'color' },
  { name: 'borderWidth', kind: 'number' },
  // liquid glass and the material surfaces underneath it. glass variants and behavior are
  // separate in SwiftUI, so interactivity stays orthogonal to the selected material.
  { name: 'glassEffect', kind: 'string', values: ['regular', 'clear', 'identity'] },
  { name: 'glassEffectInteractive', kind: 'boolean' },
  { name: 'glassEffectTint', kind: 'color' },
  {
    name: 'glassEffectShape',
    kind: 'string',
    values: [
      'capsule',
      'circle',
      'containerRelativeShape',
      'ellipse',
      'rectangle',
      'roundedRectangle',
    ],
  },
  {
    name: 'material',
    kind: 'string',
    values: ['ultraThin', 'thin', 'regular', 'thick', 'ultraThick'],
  },
] as const
export const enumTypes = [
  'MenuOrder',
  'Visibility',
  'PickerStyle',
  'DatePickerStyle',
  'ToggleStyle',
  'MenuActionDismissBehavior',
  'TabBarMinimizeBehavior',
  'ButtonRole',
  'TabRole',
  'ControlGroupStyle',
  'PrimitiveButtonStyle',
  'ProgressViewStyle',
  'GaugeStyle',
  'TextFieldStyle',
  'SubmitLabel',
  'TextInputAutocapitalization',
  'Axis',
  'Edge',
  'PresentationAdaptation',
  'PresentationContentInteraction',
  'ColorScheme',
  'DynamicTypeSize',
  'ControlSize',
  'SymbolRenderingMode',
  'SymbolVariants',
  'ImageScale',
  'PhotosPickerSelectionBehavior',
  'EncodingDisambiguationPolicy',
  'BackForwardNavigationGesturesBehavior',
  'MagnificationGesturesBehavior',
  'LinkPreviewBehavior',
  'ElementFullscreenBehavior',
  'ListStyle',
]
export const fields = {
  id: { type: 'string', default: '' },
  title: { type: 'string', default: '' },
  systemImage: { type: 'string', default: '' },
  role: { type: 'ButtonRole', default: '' },
  disabled: { type: 'boolean', default: false },
  hidden: { type: 'boolean', default: false },
  help: { type: 'string', default: '' },
  controlGroupStyle: { type: 'ControlGroupStyle', default: 'automatic' },
  values: { type: 'boolean[]', default: [] },
  menuOrder: { type: 'MenuOrder', default: '' },
  menuActionDismissBehavior: { type: 'MenuActionDismissBehavior', default: '' },
} as const
type MenuNode = {
  kind: string
  name: string
  fields: readonly (keyof typeof fields)[]
  required: readonly (keyof typeof fields)[]
  children: boolean
  constructor: { type: string; parameters: readonly { label: string; type: string }[] }
  swift: string
}
export const nodes = [
  {
    kind: 'action',
    constructor: {
      type: 'Button',
      parameters: [
        { label: 'role', type: 'SwiftUI.ButtonRole?' },
        { label: 'action', type: '@escaping @_Concurrency.MainActor () -> Swift.Void' },
        { label: 'label', type: '() -> Label' },
      ],
    },
    name: 'SwiftMenuAction',
    fields: [
      'id',
      'title',
      'systemImage',
      'role',
      'disabled',
      'hidden',
      'help',
      'menuActionDismissBehavior',
    ],
    required: ['id', 'title'],
    children: false,
    swift:
      'Button(role: OneNativeGenerated.buttonRole(item.role), action: { model.action(item.id) }) { OneNativeMenuLabel(item: item) }',
  },
  {
    kind: 'toggle',
    constructor: {
      type: 'Toggle',
      parameters: [
        { label: 'sources', type: 'C' },
        {
          label: 'isOn',
          type: 'Swift.KeyPath<C.Element, SwiftUICore.Binding<Swift.Bool>>',
        },
        { label: 'label', type: '() -> Label' },
      ],
    },
    name: 'MenuToggle',
    fields: [
      'id',
      'title',
      'systemImage',
      'values',
      'disabled',
      'hidden',
      'help',
      'menuActionDismissBehavior',
    ],
    required: ['id', 'title', 'values'],
    children: false,
    swift:
      'Toggle(sources: item.values.indices.map { index in Binding(get: { let values = model.controlled.value[item.id] ?? []; return values.indices.contains(index) && values[index] }, set: { model.changeValue(item.id, index: index, value: $0) }) }, isOn: \\.self) { OneNativeMenuLabel(item: item) }',
  },
  {
    kind: 'submenu',
    constructor: {
      type: 'Menu',
      parameters: [
        { label: 'content', type: '() -> Content' },
        { label: 'label', type: '() -> Label' },
      ],
    },
    name: 'MenuSubmenu',
    fields: [
      'id',
      'title',
      'systemImage',
      'disabled',
      'hidden',
      'help',
      'menuOrder',
      'menuActionDismissBehavior',
    ],
    required: ['id', 'title'],
    children: true,
    swift:
      'Menu { OneNativeGeneratedMenuContent(model: model, parentId: item.id) } label: { OneNativeMenuLabel(item: item) }',
  },
  {
    kind: 'section',
    constructor: {
      type: 'Section',
      parameters: [
        { label: 'content', type: '() -> Content' },
        { label: 'header', type: '() -> Parent' },
      ],
    },
    name: 'MenuSection',
    fields: ['id', 'title', 'hidden'],
    required: ['id'],
    children: true,
    swift:
      'Section { OneNativeGeneratedMenuContent(model: model, parentId: item.id) } header: { if !item.title.isEmpty { Text(item.title) } }',
  },
  {
    kind: 'controlGroup',
    constructor: {
      type: 'ControlGroup',
      parameters: [
        { label: 'content', type: '() -> C' },
        { label: 'label', type: '() -> L' },
      ],
    },
    name: 'MenuControlGroup',
    fields: ['id', 'title', 'systemImage', 'disabled', 'hidden', 'controlGroupStyle'],
    required: ['id'],
    children: true,
    swift:
      'ControlGroup { OneNativeGeneratedMenuContent(model: model, parentId: item.id) } label: { OneNativeMenuLabel(item: item) }.oneNativeControlGroupStyle(item.controlGroupStyle)',
  },
  {
    kind: 'divider',
    constructor: { type: 'Divider', parameters: [] },
    name: 'MenuDivider',
    fields: ['id'],
    required: ['id'],
    children: false,
    swift: 'Divider()',
  },
] as const satisfies readonly MenuNode[]

export const tabConstructor = {
  type: 'Tab',
  parameters: [
    { label: 'value', type: 'Value' },
    { label: 'role', type: 'SwiftUI.TabRole?' },
    { label: 'content', type: '() -> Content' },
    { label: 'label', type: '() -> Label' },
  ],
} as const

export const modifierFamilies = [
  'menu',
  'tabBar',
  'tabView',
  'controlGroup',
  'palette',
  'picker',
  'datePicker',
  'toggle',
  'slider',
  'stepper',
]
const controlledProps = { acknowledgedEvent: 'Int32', revision: 'Int32' } as const
const controlledEvent = { eventCount: 'Int32', revision: 'Int32' } as const
export const components = [
  {
    name: 'OneNativeMenu',
    publicName: 'Menu',
    props: {
      items: 'ReadonlyArray<NativeMenuItem>',
      triggerLabel: 'string',
      disabled: 'boolean',
      menuOrder: 'string',
      menuActionDismissBehavior: 'string',
      // menu opens on tap and owns the trigger; contextMenu opens on long press and
      // leaves the trigger interactive.
      presentation: 'string',
      ...controlledProps,
    },
    events: {
      onNativeMenuAction: { id: 'string' },
      onNativeMenuValueChange: {
        id: 'string',
        value: 'boolean',
        sourceIndex: 'Int32',
        ...controlledEvent,
      },
    },
    enumProps: {
      menuOrder: 'MenuOrder',
      menuActionDismissBehavior: 'MenuActionDismissBehavior',
    },
    controlled: { event: 'onNativeMenuValueChange' },
    layout: { kind: 'container' },
    slots: [
      {
        name: 'trigger',
        content: 'react-native',
        cardinality: 'one',
        layout: 'yoga',
        interaction: 'passive',
      },
    ],
    interfaceOnly: false,
  },
  {
    name: 'OneNativeTabs',
    publicName: 'Tabs',
    props: {
      selection: 'string',
      sidebarAdaptable: 'boolean',
      tabBarMinimizeBehavior: 'string',
      ...controlledProps,
    },
    events: {
      onNativeTabsSelectionChange: { selection: 'string', ...controlledEvent },
      // pressing an action tab is not a state change, so it carries no controlled event.
      onNativeTabsAction: { tabId: 'string' },
    },
    enumProps: { tabBarMinimizeBehavior: 'TabBarMinimizeBehavior' },
    controlled: { value: 'selection', event: 'onNativeTabsSelectionChange' },
    layout: { kind: 'container' },
    slots: [
      {
        name: 'pages',
        content: 'OneNativeTab',
        cardinality: 'many',
        key: 'tabId',
        layout: 'swiftui',
      },
    ],
    interfaceOnly: false,
  },
  {
    name: 'OneNativeTab',
    publicName: 'Tab',
    props: {
      tabId: 'string',
      title: 'string',
      systemImage: 'string',
      badge: 'string',
      tabRole: 'string',
      // an action tab reports presses and never becomes the selection.
      action: 'boolean',
    },
    events: {},
    enumProps: { tabRole: 'TabRole' },
    layout: { kind: 'container' },
    slots: [
      {
        name: 'content',
        content: 'react-native',
        cardinality: 'many',
        layout: 'swiftui-proposal-to-yoga',
      },
    ],
    interfaceOnly: true,
  },
  {
    name: 'OneNativeList',
    publicName: 'List',
    props: {
      listStyle: 'string',
    },
    events: {},
    enumProps: { listStyle: 'ListStyle' },
    layout: { kind: 'container' },
    slots: [
      {
        name: 'content',
        content: 'one-native',
        cardinality: 'many',
        layout: 'composed',
      },
    ],
    interfaceOnly: false,
  },
  {
    name: 'OneNativeScrollView',
    publicName: 'ScrollView',
    props: {
      axes: 'string',
      showsIndicators: 'boolean',
    },
    events: {},
    enumProps: {},
    layout: { kind: 'container' },
    slots: [
      {
        name: 'content',
        content: 'one-native',
        cardinality: 'many',
        layout: 'composed',
      },
    ],
    interfaceOnly: false,
  },
  {
    name: 'OneNativeLazyVStack',
    publicName: 'LazyVStack',
    props: {
      alignment: 'string',
      spacing: 'Double',
    },
    events: {},
    enumProps: {},
    layout: { kind: 'container' },
    slots: [
      {
        name: 'content',
        content: 'one-native',
        cardinality: 'many',
        layout: 'composed',
      },
    ],
    interfaceOnly: false,
  },
  {
    name: 'OneNativeLazyHStack',
    publicName: 'LazyHStack',
    props: {
      alignment: 'string',
      spacing: 'Double',
    },
    events: {},
    enumProps: {},
    layout: { kind: 'container' },
    slots: [
      {
        name: 'content',
        content: 'one-native',
        cardinality: 'many',
        layout: 'composed',
      },
    ],
    interfaceOnly: false,
  },
  {
    name: 'OneNativeControlGroup',
    publicName: 'ControlGroup',
    props: {
      label: 'string',
      systemImage: 'string',
      controlGroupStyle: 'string',
    },
    events: {},
    enumProps: { controlGroupStyle: 'ControlGroupStyle' },
    layout: { kind: 'container' },
    slots: [
      {
        name: 'content',
        content: 'one-native',
        cardinality: 'many',
        layout: 'composed',
      },
    ],
    interfaceOnly: false,
  },
  {
    name: 'OneNativeDisclosureGroup',
    publicName: 'DisclosureGroup',
    props: {
      label: 'string',
      isExpanded: 'boolean',
      acknowledgedEvent: 'Int32',
      revision: 'Int32',
    },
    events: {
      onNativeDisclosureGroupIsExpandedChange: {
        value: 'boolean',
        eventCount: 'Int32',
        revision: 'Int32',
      },
    },
    enumProps: {},
    controlled: {
      value: 'isExpanded',
      event: 'onNativeDisclosureGroupIsExpandedChange',
    },
    layout: { kind: 'container' },
    slots: [
      {
        name: 'content',
        content: 'one-native',
        cardinality: 'many',
        layout: 'composed',
      },
    ],
    interfaceOnly: false,
  },
  {
    name: 'OneNativeDivider',
    publicName: 'Divider',
    props: {},
    events: {},
    enumProps: {},
    layout: { kind: 'container' },
    slots: [],
    interfaceOnly: false,
  },
  {
    name: 'OneNativeLink',
    publicName: 'Link',
    props: {
      destination: 'string',
      label: 'string',
    },
    events: {},
    enumProps: {},
    layout: { kind: 'container' },
    slots: [
      {
        name: 'content',
        content: 'one-native',
        cardinality: 'many',
        layout: 'composed',
      },
    ],
    interfaceOnly: false,
  },
  {
    name: 'OneNativeGroup',
    publicName: 'Group',
    props: {},
    events: {},
    enumProps: {},
    layout: { kind: 'container' },
    slots: [
      {
        name: 'content',
        content: 'one-native',
        cardinality: 'many',
        layout: 'composed',
      },
    ],
    interfaceOnly: false,
  },
  {
    name: 'OneNativeOverlay',
    publicName: 'Overlay',
    props: {
      alignment: 'string',
    },
    events: {},
    enumProps: {},
    layout: { kind: 'container' },
    slots: [
      {
        name: 'content',
        content: 'one-native',
        cardinality: 'many',
        layout: 'composed',
      },
    ],
    interfaceOnly: false,
  },
  {
    name: 'OneNativeOverlayContent',
    publicName: 'OverlayContent',
    props: {},
    events: {},
    enumProps: {},
    layout: { kind: 'container' },
    slots: [
      {
        name: 'content',
        content: 'one-native',
        cardinality: 'many',
        layout: 'composed',
      },
    ],
    interfaceOnly: true,
  },
  {
    name: 'OneNativeSwipeActions',
    publicName: 'SwipeActions',
    props: {},
    events: {},
    enumProps: {},
    layout: { kind: 'container' },
    slots: [
      {
        name: 'content',
        content: 'one-native',
        cardinality: 'many',
        layout: 'composed',
      },
    ],
    interfaceOnly: false,
  },
  {
    name: 'OneNativeSwipeActionsActions',
    publicName: 'SwipeActionsActions',
    props: {
      edge: 'string',
      allowsFullSwipe: 'boolean',
    },
    events: {},
    enumProps: {},
    layout: { kind: 'container' },
    slots: [
      {
        name: 'content',
        content: 'one-native',
        cardinality: 'many',
        layout: 'composed',
      },
    ],
    interfaceOnly: true,
  },
  {
    name: 'OneNativePager',
    publicName: 'Pager',
    props: {
      selection: 'string',
      acknowledgedEvent: 'Int32',
      revision: 'Int32',
    },
    events: {
      onNativePagerSelectionChange: {
        selection: 'string',
        eventCount: 'Int32',
        revision: 'Int32',
      },
    },
    enumProps: {},
    controlled: { value: 'selection', event: 'onNativePagerSelectionChange' },
    layout: { kind: 'container' },
    slots: [
      {
        name: 'pages',
        content: 'OneNativeTab',
        cardinality: 'many',
        key: 'tabId',
        layout: 'swiftui',
      },
    ],
    interfaceOnly: false,
  },
  {
    // first-party safe-area boundary: a Yoga view that reports its own
    // safe-area insets plus its frame to React. the insets source is UIKit
    // on iOS and WindowInsets on Android; the adapter reshapes the flat
    // event fields into EdgeInsets and a frame. no controlled protocol: an
    // inset update is a sensor reading, never a state change to acknowledge.
    name: 'OneNativeSafeAreaProvider',
    publicName: 'SafeAreaProvider',
    props: {},
    events: {
      onNativeInsetsChange: {
        insetTop: 'Double',
        insetRight: 'Double',
        insetBottom: 'Double',
        insetLeft: 'Double',
        frameX: 'Double',
        frameY: 'Double',
        frameWidth: 'Double',
        frameHeight: 'Double',
      },
    },
    layout: { kind: 'container' },
    slots: [
      {
        name: 'children',
        content: 'react-native',
        cardinality: 'many',
        layout: 'yoga',
      },
    ],
    interfaceOnly: false,
  },
  {
    // owned edge-fade primitive (UI.EdgeFade mask and blur modes). a Yoga
    // container that alpha-fades its children toward any edge (mask) or
    // progressively blurs them toward the edge (blur). sizes are dp (0 =
    // disabled); curves are preset names or serialized alpha stops.
    // overlayColor is 0xAARRGGBB resolved in JS (0 = no frost veil), so the
    // main emitter needs no color support and both platforms read one int.
    // overlay mode never reaches this view: RN core backgroundImage
    // gradients paint it in JS. no events: a fade is pure presentation.
    name: 'OneNativeEdgeFade',
    publicName: 'EdgeFade',
    props: {
      fadeTop: 'Double',
      fadeBottom: 'Double',
      fadeLeft: 'Double',
      fadeRight: 'Double',
      curveTop: 'string',
      curveBottom: 'string',
      curveLeft: 'string',
      curveRight: 'string',
      fadeRadius: 'Double',
      mode: 'string',
      blurRadius: 'Double',
      frostProgression: 'Double',
      overlayColor: 'Int32',
    },
    events: {},
    enumProps: {},
    layout: { kind: 'container' },
    slots: [
      {
        name: 'children',
        content: 'react-native',
        cardinality: 'many',
        layout: 'yoga',
      },
    ],
    interfaceOnly: false,
  },
  {
    // owned regular blur (UI.Blur, expo-blur compatible). blurs the backdrop
    // behind the view; children mount sharp on top. tint is the expo tint
    // name; intensity is 0-1 normalized in JS (expo units are 0-100).
    name: 'OneNativeBlur',
    publicName: 'Blur',
    props: {
      tint: 'string',
      intensity: 'Double',
    },
    events: {},
    enumProps: {},
    layout: { kind: 'container' },
    slots: [
      {
        name: 'children',
        content: 'react-native',
        cardinality: 'many',
        layout: 'yoga',
      },
    ],
    interfaceOnly: false,
  },
  {
    // owned arbitrary mask (UI.Mask, masked-view compatible). the first
    // child is the mask element (never displayed, only masks); the rest are
    // content. no props: shape comes entirely from the subtrees.
    name: 'OneNativeMask',
    publicName: 'Mask',
    props: {},
    events: {},
    enumProps: {},
    layout: { kind: 'container' },
    slots: [
      {
        name: 'children',
        content: 'react-native',
        cardinality: 'many',
        layout: 'yoga',
      },
    ],
    interfaceOnly: false,
  },
  {
    // uniform map (UI.Map): SwiftUI Map on iOS, Google Maps Compose on
    // Android. markers cross as a struct array like Swift.Map; overlays cross
    // as one json string because polylines and polygons carry nested
    // coordinate lists, which codegen object props cannot spell. both
    // platforms decode it natively; there is no js copy of the parse. a leaf
    // with heavy state, so it takes the yoga box and owns no slots.
    name: 'OneNativeUiMap',
    publicName: 'UiMap',
    props: {
      latitude: 'Double',
      longitude: 'Double',
      zoom: 'Double',
      markers: 'ReadonlyArray<UiMapMarker>',
      overlays: 'string',
    },
    payloadTypes: {
      UiMapMarker:
        'Readonly<{ id: string; title: string; latitude: Double; longitude: Double; tint: string }>',
    },
    events: {
      onNativeUiMapCameraMove: {
        latitude: 'Double',
        longitude: 'Double',
        zoom: 'Double',
      },
      onNativeUiMapMarkerClick: { id: 'string' },
      onNativeUiMapClick: { latitude: 'Double', longitude: 'Double' },
    },
    enumProps: {},
    layout: { kind: 'fill' },
    slots: [],
    interfaceOnly: false,
  },
] as const
