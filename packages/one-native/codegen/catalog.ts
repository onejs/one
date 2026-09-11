// semantic mappings that the Swift declarations alone cannot determine.
export const modifiers = [
  { name: 'menuOrder', type: 'MenuOrder', default: 'automatic' },
  {
    name: 'menuActionDismissBehavior',
    type: 'MenuActionDismissBehavior',
    default: 'automatic',
  },
  { name: 'controlGroupStyle', type: 'ControlGroupStyle', default: 'automatic' },
  { name: 'tabBarMinimizeBehavior', type: 'TabBarMinimizeBehavior', default: '' },
] as const
export const enumTypes = [
  'MenuOrder',
  'MenuActionDismissBehavior',
  'TabBarMinimizeBehavior',
  'ButtonRole',
  'TabRole',
  'ControlGroupStyle',
]
export const constructors = [
  { type: 'Menu', labels: ['content', 'label'] },
  { type: 'Button', labels: ['role', 'action', 'label'] },
  { type: 'Toggle', labels: ['sources', 'isOn', 'label'] },
  { type: 'Section', labels: ['content', 'header'] },
  { type: 'ControlGroup', labels: ['content', 'label'] },
  { type: 'Divider', labels: [] },
  { type: 'Tab', labels: ['value', 'role', 'content', 'label'] },
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
export const nodes = [
  {
    kind: 'action',
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
      'Toggle(sources: item.values.indices.map { index in Binding(get: { item.values[index] }, set: { model.changeValue(item.id, index: index, value: $0) }) }, isOn: \\.self) { OneNativeMenuLabel(item: item) }',
  },
  {
    kind: 'submenu',
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
    name: 'MenuSection',
    fields: ['id', 'title', 'hidden'],
    required: ['id'],
    children: true,
    swift:
      'Section { OneNativeGeneratedMenuContent(model: model, parentId: item.id) } header: { if !item.title.isEmpty { Text(item.title) } }',
  },
  {
    kind: 'controlGroup',
    name: 'MenuControlGroup',
    fields: ['id', 'title', 'systemImage', 'disabled', 'hidden', 'controlGroupStyle'],
    required: ['id'],
    children: true,
    swift:
      'ControlGroup { OneNativeGeneratedMenuContent(model: model, parentId: item.id) } label: { OneNativeMenuLabel(item: item) }.oneNativeControlGroupStyle(item.controlGroupStyle)',
  },
  {
    kind: 'divider',
    name: 'MenuDivider',
    fields: ['id'],
    required: ['id'],
    children: false,
    swift: 'Divider()',
  },
] as const
