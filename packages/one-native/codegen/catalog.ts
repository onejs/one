// semantic mappings that the Swift declarations alone cannot determine.
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
export type StyleFieldKind = 'number' | 'string' | 'color'

export interface StyleField {
  name: string
  kind: StyleFieldKind
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
  'SymbolRenderingMode',
  'SymbolVariants',
  'ImageScale',
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
    name: 'MenuAction',
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
] as const
