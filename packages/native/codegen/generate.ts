import { containerComponents, contentComponents, emitContainers, environmentMethods } from './emitContainers'
import { emitPopover, popoverComponents, popoverMethods } from './emitPopover'
import { emitSheet, sheetComponents, sheetMethods } from './emitSheet'
import { controls as curatedControls } from './controlCatalog'
import { emitControls } from './emitControls'
import { emitStyle } from './emitStyle'
import { deriveModifiers, deriveViewSlots, deriveViews } from './deriveSDK'
import { emitMenuValidator } from './menuValidator'
import {
  readInventory,
  ios,
  present,
  selectConstructor,
  selectModifier,
  type Declaration,
} from './inventory'
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  tabConstructor,
  components,
  frameworks,
  handwrittenComponents,
  menuMethods,
  modifierFamilies,
  enumTypes,
  fields,
  modifiers,
  styleModifiers,
  styleFields,
  nodes,
} from './catalog'

// the floor the package targets. everything the SDK marks at or below it needs no gate, so
// raising this deletes availability branches rather than adding them. schema.json carries it
// forward and VxrnNative.podspec reads it from there, so this is the only place it is set.
const MINIMUM_IOS = 17
// the ceiling the checked-in bindings must compile against. CI pins an Xcode on this SDK
// major, so symbols introduced above it are skipped and every newer toolchain produces
// identical output. bump this when CI moves to a newer Xcode, then regenerate.
const MAXIMUM_IOS = 27

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const cache = join(root, '.codegen-cache')
mkdirSync(cache, { recursive: true })
const run = (file: string, args: string[]) =>
  execFileSync(file, args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }).trim()
const { sdk, swiftc, inventory } = readInventory(root)
const controls = [
  ...curatedControls,
  ...deriveViews(
    inventory,
    MINIMUM_IOS,
    new Set([
      ...curatedControls.map((control) => control.name),
      ...components.map((component) => component.publicName),
      ...containerComponents.map((component) => component.publicName),
      ...contentComponents.map((component) => component.publicName),
      ...sheetComponents.map((component) => component.publicName),
      ...popoverComponents.map((component) => component.publicName),
    ])
  ),
]
const derivedModifiers = deriveModifiers(inventory, MAXIMUM_IOS, [
  ...styleFields,
  ...styleModifiers,
])
const derivedViewSlots = deriveViewSlots(inventory, MAXIMUM_IOS)
const sdkVersion = run('xcrun', ['--sdk', 'iphonesimulator', '--show-sdk-version'])
if (Number(sdkVersion.split('.')[0]) < MAXIMUM_IOS)
  throw new Error(
    `SwiftUI bindings target SDK ${MAXIMUM_IOS}, selected toolchain provides ${sdkVersion}`
  )
const shortOwner = (d: Declaration) => d.owner.split('.').at(-1)
const ownerMatches = (d: Declaration, type: string) => {
  const parts = d.owner.split('.')
  return parts.at(-1) === type || parts.slice(-2).join('') === type
}
const selected: Declaration[] = []
// the hill-climb sets: every SDK view constructor and view modifier the generator
// binds, per module. enum cases and the RoundedRectangle/EdgeInsets/Color helpers are
// selected but not covered: they are value plumbing, not bound views or modifiers.
const coveredViews = new Map<string, Set<string>>()
const coveredModifiers = new Map<string, Set<string>>()
const cover = (map: Map<string, Set<string>>, declaration: Declaration, name: string) => {
  const names = map.get(declaration.module) ?? new Set<string>()
  names.add(name)
  map.set(declaration.module, names)
}
const coverView = (declaration: Declaration) =>
  cover(coveredViews, declaration, shortOwner(declaration) ?? declaration.owner)
const coverModifier = (declaration: Declaration) =>
  cover(coveredModifiers, declaration, declaration.name)
for (const modifier of derivedModifiers) {
  const declaration = inventory.find(
    (d) =>
      d.kind === 'func' &&
      d.name === (modifier.sdkName ?? modifier.name) &&
      (!modifier.module || d.module === modifier.module) &&
      (modifier.zeroArgument
        ? d.parameters.length === 0
        : modifier.kind === 'record'
          ? d.parameters.length === modifier.arguments?.length &&
            d.parameters.every((parameter, index) =>
              parameter.label === modifier.arguments?.[index].label &&
              parameter.type === modifier.arguments?.[index].type)
        : d.parameters.some((parameter) => parameter.type === modifier.type &&
            (modifier.label === undefined || parameter.label === modifier.label))) &&
      d.owner.split('.').at(-1) === 'View'
  )
  if (!declaration) throw new Error(`lost SDK declaration for ${modifier.name}`)
  coverModifier(declaration)
}
for (const slot of derivedViewSlots) {
  const declaration = inventory.find((d) =>
    d.kind === 'func' && d.module === slot.module && d.owner.split('.').at(-1) === 'View' &&
    d.name === slot.name && d.parameters.length === 1 &&
    d.parameters[0].label === slot.label &&
    d.requirements?.length === 1 &&
    d.requirements[0] === `${d.parameters[0].type.slice(6)} : SwiftUICore.View`
  )
  if (!declaration) throw new Error(`lost SDK declaration for ${slot.name} slot`)
  coverModifier(declaration)
}
const enums = Object.fromEntries(
  enumTypes.map((type) => {
    const cases = inventory.filter(
      (d) =>
        ownerMatches(d, type) &&
        d.kind === 'static' &&
        (type.endsWith('Style') ||
          d.type === 'Scale' ||
          d.type?.split('.').at(-1) === type) &&
        present(d) &&
        ios(d) <= MAXIMUM_IOS
    )
    if (!cases.length) throw new Error(`no SDK cases for ${type}`)
    selected.push(...cases)
    return [type, Object.fromEntries(cases.map((d) => [d.name, ios(d)]))]
  })
) as Record<string, Record<string, number>>
const methods = modifiers.map((modifier) => {
  const isStyle = modifier.type.endsWith('Style')
  const method = selectModifier(inventory, {
    name: modifier.name,
    parameters: [
      {
        label: '_',
        type: isStyle
          ? 'S'
          : `${'module' in modifier ? modifier.module : 'SwiftUI'}.${'swiftType' in modifier ? (modifier as { swiftType: string }).swiftType : modifier.type}${'optional' in modifier && modifier.optional ? '?' : ''}`,
      },
    ],
    requirements: isStyle ? [`S: SwiftUI.${modifier.type}`] : [],
  })
  selected.push(method)
  coverModifier(method)
  return {
    ...modifier,
    ios: ios(method),
    parameters: method.parameters,
    requirements: method.requirements,
  }
})
for (const constructor of [
  ...nodes.map((node) => node.constructor),
  tabConstructor,
  ...controls.flatMap((control) => control.constructors),
]) {
  const declaration = selectConstructor(inventory, constructor)
  selected.push(declaration)
  coverView(declaration)
}
for (const control of controls) {
  for (const method of control.methods ?? []) {
    const declaration = selectModifier(inventory, method)
    selected.push(declaration)
    coverModifier(declaration)
  }
}
const header =
  '// generated by bun run generate from the SwiftUI SDK and codegen/catalog.ts.\n// edit the generator or catalog, then regenerate.\n'
const outputs = new Map<string, string>()
const { schema: controlComponents, payloads: controlPayloads } = emitControls(
  header,
  outputs,
  inventory,
  styleFields,
  derivedModifiers,
  controls
) ?? { schema: [], payloads: {} }
emitSheet(header, outputs)
emitContainers(header, outputs, styleFields)
emitPopover(header, outputs)
emitStyle(header, outputs, styleFields, derivedModifiers, derivedViewSlots)
// the sync-state TurboModule spec: pod-install and gradle codegen read it from
// src/specs alongside the view specs. emitted here so --check guards the JSI
// contract byte for byte. it carries no view config (see isViewSpecFile).
outputs.set(
  'src/specs/OneNativeSyncStateNativeModule.ts',
  `${header}import type { TurboModule } from 'react-native'
import { TurboModuleRegistry } from 'react-native'

export interface Spec extends TurboModule {
  install(): boolean
}

export default TurboModuleRegistry.getEnforcing<Spec>('OneNativeSyncState')
`
)
for (const method of [
  ...sheetMethods,
  ...popoverMethods,
  ...environmentMethods,
  ...menuMethods,
  ...styleModifiers,
]) {
  const declaration = selectModifier(inventory, method)
  selected.push(declaration)
  coverModifier(declaration)
}
selected.push(
  selectConstructor(inventory, {
    type: 'RoundedRectangle',
    parameters: [
      { label: 'cornerRadius', type: 'CoreFoundation.CGFloat' },
      { label: 'style', type: 'SwiftUICore.RoundedCornerStyle' },
    ],
  }),
  selectConstructor(inventory, {
    type: 'EdgeInsets',
    parameters: [
      { label: 'top', type: 'CoreFoundation.CGFloat' },
      { label: 'leading', type: 'CoreFoundation.CGFloat' },
      { label: 'bottom', type: 'CoreFoundation.CGFloat' },
      { label: 'trailing', type: 'CoreFoundation.CGFloat' },
    ],
  }),
  selectConstructor(inventory, {
    type: 'Color',
    parameters: [{ label: 'uiColor', type: 'UIKit.UIColor' }],
  })
)
outputs.set(
  'src/generated/swiftui.ts',
  header +
    Object.entries(enums)
      .map(
        ([name, cases]) =>
          `export type ${name} = ${Object.keys(cases)
            .map((c) => JSON.stringify(c))
            .join(' | ')}`
      )
      .join('\n') +
    `
export const swiftUIValues = ${JSON.stringify(enums, null, 2)} as const
export function assertSwiftUIValue(type: keyof typeof swiftUIValues, value: string, iosVersion: number) {
  const values: Record<string, number> = swiftUIValues[type]
  if (!Object.hasOwn(values, value)) throw new Error('Unknown SwiftUI ' + type + ': ' + value)
  if (iosVersion < values[value]) throw new Error(type + '.' + value + ' requires iOS ' + values[value])
}
`
)
const fieldType = (type: string, publicType = false) =>
  type === 'boolean[]'
    ? publicType
      ? 'readonly boolean[]'
      : 'ReadonlyArray<boolean>'
    : enumTypes.includes(type)
      ? publicType
        ? type
        : 'string'
      : type
outputs.set(
  'src/generated/types.ts',
  header +
    `import type { ReactNode } from 'react'
import type { ViewProps } from 'react-native'
import type { ${enumTypes.join(', ')} } from './swiftui'
export type { ${enumTypes.join(', ')} } from './swiftui'
` +
    nodes
      .map(
        (node) => `export interface ${node.name} {
  type: '${node.kind}'
${node.fields.map((name) => `  ${name}${(node.required as readonly string[]).includes(name) ? '' : '?'}: ${fieldType(fields[name].type, true)}`).join('\n')}
${node.children ? '  children: readonly MenuItem[]\n' : ''}}
`
      )
      .join('\n') +
    `
export type MenuItem = ${nodes.map((node) => node.name).join(' | ')}
export interface MenuProps extends ViewProps {
  items: readonly MenuItem[]
  onAction: (id: string) => void
  onValueChange?: (id: string, value: boolean, sourceIndex: number) => void
  accessibilityLabel: string
  revision?: number
  disabled?: boolean
  menuOrder?: MenuOrder
  menuActionDismissBehavior?: MenuActionDismissBehavior
  children: ReactNode
}
// a context menu leaves its trigger interactive and visible to accessibility, so React
// Native's own label on that subtree stands and the menu takes none of its own.
export type ContextMenuProps = Omit<MenuProps, 'accessibilityLabel'> & {
  accessibilityLabel?: string
}
`
)
const nativeFields = { parentId: { type: 'string' }, type: { type: 'string' }, ...fields }
const nativeItem = `export type NativeMenuItem = Readonly<{\n${Object.entries(
  nativeFields
)
  .map(([name, field]) => `  ${name}: ${fieldType(field.type)}`)
  .join('\n')}\n}>`
for (const component of components) {
  // a static object-array prop needs its element shape declared in the spec,
  // the way the menu hard-codes NativeMenuItem. payloadTypes generalizes that
  // one-off: name to shape, emitted verbatim above the props interface.
  const payloadEntries: Array<[string, string]> =
    'payloadTypes' in component ? Object.entries(component.payloadTypes) : []
  // numeric props arrive as CodegenTypes scalars, so the spec imports the ones the
  // recipe uses. components without them keep the historical import byte for byte.
  const usedTypes = [
    ...Object.values(component.props),
    ...payloadEntries.map(([, shape]) => shape),
    ...Object.values(component.events).flatMap((fields) =>
      Object.values(fields as Record<string, string>)
    ),
  ].join(' ')
  const numeric = ['Double', 'Float'].filter((type) =>
    new RegExp(`\\b${type}\\b`).test(usedTypes)
  )
  const payloadDeclarations = payloadEntries
    .map(([name, shape]) => `type ${name} = ${shape}\n`)
    .join('')
  outputs.set(
    `src/specs/${component.name}NativeComponent.ts`,
    header +
      `import type { ViewProps } from 'react-native'
import type { ${['DirectEventHandler', 'Int32', ...numeric].join(', ')} } from 'react-native/Libraries/Types/CodegenTypes'
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent'
${component.name === 'OneNativeMenu' ? nativeItem : ''}${payloadDeclarations}
interface NativeProps extends ViewProps {
${Object.entries(component.props)
  .map(([name, type]) => `  ${name}: ${type}`)
  .join('\n')}
${Object.entries(component.events)
  .map(
    ([name, fields]) =>
      `  ${name}?: DirectEventHandler<Readonly<{ ${Object.entries(fields)
        .map(([name, type]) => `${name}: ${type}`)
        .join('; ')} }>>`
  )
  .join('\n')}
}
export default codegenNativeComponent<NativeProps>('${component.name}'${component.interfaceOnly ? ', { interfaceOnly: true }' : ''})
`
  )
}
outputs.set(
  'schema.json',
  JSON.stringify(
    {
      version: 2,
      platform: 'ios',
      minimumVersion: MINIMUM_IOS,
      controlledProtocol: {
        version: 1,
        revision: 'revision',
        acknowledgement: 'acknowledgedEvent',
        eventCount: 'eventCount',
      },
      eventDelivery: {
        kind: 'direct',
        payloadWrapper: 'nativeEvent',
        note: 'React Native delivers each event as onX({ nativeEvent: payload }).',
      },
      components: [
        ...components,
        ...controlComponents,
        ...sheetComponents,
        ...containerComponents,
        ...contentComponents,
        ...popoverComponents,
      ].map((component) => {
        const enumProps: Record<string, string> =
          'enumProps' in component ? component.enumProps : {}
        return {
          name: component.name,
          publicName: component.publicName,
          props: Object.fromEntries(
            Object.entries(component.props).map(([key, declared]) => {
              const type = declared.replace('?', '')
              return [key, enumProps[key] ? { type, enum: enumProps[key] } : { type }]
            })
          ),
          events: Object.fromEntries(
            Object.entries(component.events).map(([key, payload]) => [
              key,
              Object.fromEntries(
                Object.entries(payload as Record<string, string>).map(([field, type]) => [
                  field,
                  { type },
                ])
              ),
            ])
          ),
          controlled: 'controlled' in component ? component.controlled : undefined,
          actions: 'actions' in component ? component.actions : [],
          layout: 'layout' in component ? component.layout : undefined,
          slots: component.slots,
          interfaceOnly: component.interfaceOnly,
        }
      }),
      payloads: {
        ...Object.fromEntries(
          Object.entries(controlPayloads).map(([name, payload]) => [
            name,
            {
              fields: Object.fromEntries(
                Object.entries(payload.element).map(([field, type]) => [field, { type }])
              ),
            },
          ])
        ),
        NativeSheetDetent: {
          fields: { type: { type: 'string' }, value: { type: 'Double' } },
        },
        NativeMenuItem: {
          fields: nativeFields,
          nodes: nodes.map(({ swift, constructor, ...node }) => ({
            ...node,
            swiftType: constructor.type,
          })),
        },
      },
      enums,
    },
    null,
    2
  ) + '\n'
)
outputs.set('src/menuItems.ts', emitMenuValidator(header, MINIMUM_IOS))
let swift =
  header +
  ['SwiftUI', ...frameworks].map((framework) => `import ${framework}\n`).join('') +
  '\nenum OneNativeGenerated {\n'
// a case list that lives on a nested type spells its Swift return type differently from the
// name the inventory indexes it under.
const swiftTypeNames: Record<string, string> = {
  ImageScale: 'Image.Scale',
  EncodingDisambiguationPolicy: 'PhotosPickerItem.EncodingDisambiguationPolicy',
  BackForwardNavigationGesturesBehavior: 'WebView.BackForwardNavigationGesturesBehavior',
  MagnificationGesturesBehavior: 'WebView.MagnificationGesturesBehavior',
  LinkPreviewBehavior: 'WebView.LinkPreviewBehavior',
  ElementFullscreenBehavior: 'WebView.ElementFullscreenBehavior',
}
for (const [type, cases] of Object.entries(enums)) {
  if (type.endsWith('Style')) continue
  const swiftReturnType = swiftTypeNames[type] ?? type
  // an empty string is the SDK's own default, which these express as nil.
  const optional = ['ButtonRole', 'TabRole', 'Edge'].includes(type)
  const minimum = Math.min(...Object.values(cases))
  if (minimum > MINIMUM_IOS) swift += `  @available(iOS ${minimum}, *)\n`
  swift += `  static func ${type[0].toLowerCase() + type.slice(1)}(_ value: String) -> ${swiftReturnType}${optional ? '?' : ''} {\n    switch value {\n`
  if (optional) swift += '    case "": return nil\n'
  for (const [name, version] of Object.entries(cases)) {
    swift += `    case "${name}":\n`
    swift +=
      version > Math.max(MINIMUM_IOS, minimum)
        ? `      if #available(iOS ${version}, *) { return .${name} }\n      preconditionFailure("${type}.${name} requires iOS ${version}")\n`
        : `      return .${name}\n`
  }
  swift += `    default: preconditionFailure("invalid ${type}: \\(value)")\n    }\n  }\n`
}
swift += '}\n\nextension View {\n'
for (const method of methods) {
  if (method.type.endsWith('Style')) {
    swift += `  @ViewBuilder func oneNative${method.name[0].toUpperCase() + method.name.slice(1)}(_ value: String) -> some View {\n    switch value {\n`
    for (const [name, version] of Object.entries(enums[method.type])) {
      swift += `    case "${name}":\n`
      swift +=
        version > MINIMUM_IOS
          ? `      if #available(iOS ${version}, *) { self.${method.name}(.${name}) } else { let _ = preconditionFailure("${method.type}.${name} requires iOS ${version}"); self }\n`
          : `      self.${method.name}(.${name})\n`
    }
    swift += `    default: let _ = preconditionFailure("invalid ${method.type}: \\(value)"); self\n    }\n  }\n`
    continue
  }
  const apply = `self.${method.name}(OneNativeGenerated.${method.type[0].toLowerCase() + method.type.slice(1)}(value))`
  swift += `  @ViewBuilder func oneNative${method.name[0].toUpperCase() + method.name.slice(1)}(_ value: String) -> some View {\n`
  if (method.ios > MINIMUM_IOS) {
    swift += `    if #available(iOS ${method.ios}, *) {\n      if value.isEmpty { self } else { ${apply} }\n    } else {\n      let _ = precondition(value.isEmpty, "${method.name} requires iOS ${method.ios}")\n      self\n    }\n`
  } else swift += `    if value.isEmpty { self } else { ${apply} }\n`
  swift += '  }\n'
}
swift += '}\n'
outputs.set('ios/Generated/OneNativeSwiftUI.swift', swift)
outputs.set(
  'ios/Generated/OneNativeMenuContent.swift',
  header +
    `import SwiftUI

enum OneNativeMenuKind: String {
${nodes.map((node) => `  case ${node.kind}`).join('\n')}
}
struct OneNativeMenuNode: Identifiable {
${Object.entries(nativeFields)
  .map(
    ([name, field]) =>
      `  let ${name}: ${name === 'type' ? 'OneNativeMenuKind' : field.type === 'boolean' ? 'Bool' : field.type === 'boolean[]' ? '[Bool]' : 'String'}`
  )
  .join('\n')}
  init(_ item: [String: Any]) {
${Object.entries(nativeFields)
  .map(([name, field]) =>
    name === 'type'
      ? '    type = OneNativeMenuKind(rawValue: item["type"] as! String)!'
      : `    ${name} = item["${name}"] as! ${field.type === 'boolean' ? 'Bool' : field.type === 'boolean[]' ? '[Bool]' : 'String'}`
  )
  .join('\n')}
  }
}
struct OneNativeMenuLabel: View {
  let item: OneNativeMenuNode
  var body: some View {
    if item.systemImage.isEmpty { Text(item.title) }
    else { Label(item.title, systemImage: item.systemImage) }
  }
}
struct OneNativeGeneratedMenuContent: View {
  @ObservedObject var model: OneNativeMenuModel
  let parentId: String
  var body: some View {
    ForEach(model.children[parentId] ?? []) { item in
      if !item.hidden {
        Group {
          switch item.type {
${nodes.map((node) => `          case .${node.kind}:\n            ${node.swift}`).join('\n')}
          }
        }
        .disabled(item.disabled)
        .help(item.help)
        .oneNativeMenuOrder(item.menuOrder)
        .oneNativeMenuActionDismissBehavior(item.menuActionDismissBehavior)
      }
    }
  }
}
`
)
outputs.set(
  'ios/Generated/OneNativeMenuPayload.h',
  header +
    `#ifdef __cplusplus
#import <React/RCTConversions.h>
#import <react/renderer/components/OneNativeSpec/Props.h>
template <typename Item>
inline bool OneNativeMenuItemsEqual(const std::vector<Item> &a, const std::vector<Item> &b) {
  if (a.size() != b.size()) return false;
  for (size_t i = 0; i < a.size(); i++) {
    if (${Object.keys(nativeFields)
      .map((name) => `a[i].${name} != b[i].${name}`)
      .join(' || ')}) return false;
  }
  return true;
}
template <typename Item>
inline NSArray *OneNativeMenuPayload(const std::vector<Item> &items) {
  NSMutableArray *result = [NSMutableArray new];
  for (const auto &item : items) {
    NSMutableArray *values = [NSMutableArray new];
    for (bool value : item.values) [values addObject:@(value)];
    [result addObject:@{
${Object.entries(nativeFields)
  .map(
    ([name, field]) =>
      `      @"${name}": ${field.type === 'boolean' ? `@(item.${name})` : field.type === 'boolean[]' ? 'values' : `RCTNSStringFromString(item.${name})`}`
  )
  .join(',\n')}
    }];
  }
  return result;
}
#endif
`
)
const manifest = {
  // the ceiling, not the local toolchain: output must be identical on every SDK at or above it.
  sdk: String(MAXIMUM_IOS),
  // xcode installations can package equivalent public interfaces with different bytes and
  // source attributes. the mapped declarations below are the portable contract we publish.
  // the scanned module list is not recorded: SDK revisions add and rename overlay modules.
  unmappedModifiers: [
    ...new Set(
      inventory
        .filter(
          (d) =>
            d.kind === 'func' &&
            shortOwner(d) === 'View' &&
            present(d) &&
            ios(d) <= MAXIMUM_IOS &&
            modifierFamilies.some((prefix) => d.name.startsWith(prefix)) &&
            !methods.some((m) => m.name === d.name) &&
            !derivedModifiers.some((m) => m.name === d.name)
        )
        .map((d) => d.name)
    ),
  ].sort(),
  enums,
  modifiers: methods,
  derivedModifiers,
  // the hill-climb sets codegen/coverage.ts reports against: bound view types and
  // view modifier names per SDK module, collected at every selection site above.
  coverage: {
    views: Object.fromEntries(
      [...coveredViews].map(([module, names]) => [module, [...names].sort()])
    ),
    modifiers: Object.fromEntries(
      [...coveredModifiers].map(([module, names]) => [module, [...names].sort()])
    ),
  },
  // constructor requirements omitted: SDK revisions restate equivalent generic
  // constraints with different spelling, so they are matching input, not contract.
  constructors: selected
    .filter((d) => d.kind === 'init')
    .map((d) => ({
      module: d.module,
      type: shortOwner(d),
      parameters: d.parameters,
      ios: ios(d),
    })),
}
outputs.set('codegen/swiftui-manifest.json', JSON.stringify(manifest, null, 2) + '\n')
const packagePath = join(root, 'package.json')
const packageMetadata = JSON.parse(readFileSync(packagePath, 'utf8'))
packageMetadata.codegenConfig.ios.componentProvider = Object.fromEntries(
  [
    ...handwrittenComponents.map((name) => ({ name })),
    ...components,
    ...controlComponents,
    ...sheetComponents,
    ...containerComponents,
    ...contentComponents,
    ...popoverComponents,
  ].map((component) => [component.name, component.name + 'ComponentView'])
)
outputs.set('package.json', JSON.stringify(packageMetadata, null, 2) + '\n')
const composeIconCodepoints: Record<string, number> = {}
for (const line of readFileSync(join(root, 'codegen/material-symbols.codepoints'), 'utf8')
  .trim()
  .split('\n')) {
  const [name, codepoint] = line.trim().split(/\s+/)
  if (!/^[a-z0-9_]+$/.test(name) || !/^[0-9a-f]{4,5}$/.test(codepoint))
    throw new Error(`Invalid Material Symbols codepoint line: ${line}`)
  if (Object.hasOwn(composeIconCodepoints, name))
    throw new Error(`Duplicate Material Symbols name: ${name}`)
  composeIconCodepoints[name] = Number.parseInt(codepoint, 16)
}
outputs.set(
  'src/generated/composeIcons.ts',
  `// generated by bun run generate from codegen/material-symbols.codepoints.
// edit the generator or the codepoints file, then regenerate.
export const composeIconCodepoints = ${JSON.stringify(composeIconCodepoints, null, 2)} as const
export type ComposeIconName = keyof typeof composeIconCodepoints
`
)
const changed: string[] = []
for (const [path, source] of outputs) {
  const temporary = join(cache, path.replaceAll('/', '_'))
  writeFileSync(temporary, source.trimEnd() + '\n')
  if (/\.tsx?$/.test(path))
    run('bunx', ['oxfmt', '-c', resolve(root, '../../.prettierrc'), temporary])
  const generated = readFileSync(temporary, 'utf8')
  let existing = ''
  try {
    existing = readFileSync(join(root, path), 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }
  if (existing !== generated) {
    changed.push(path)
    if (process.argv.includes('--check')) {
      if (path === 'codegen/swiftui-manifest.json' && existing) {
        const previous = JSON.parse(existing)
        const next = JSON.parse(generated)
        console.error(
          'SwiftUI manifest fields differ: ' +
            [...new Set([...Object.keys(previous), ...Object.keys(next)])]
              .filter(
                (key) => JSON.stringify(previous[key]) !== JSON.stringify(next[key])
              )
              .join(', ')
        )
      }
      if (!existing) console.error(`new generated file: ${path}`)
      else
        try {
          run('diff', ['-u', join(root, path), temporary])
        } catch (error) {
          console.error((error as { stdout?: string }).stdout)
        }
    }
  }
  if (!process.argv.includes('--check')) writeFileSync(join(root, path), generated)
}
if (process.argv.includes('--check') && changed.length)
  throw new Error('Generated SwiftUI bindings differ: ' + changed.join(', '))
// compile the assembled source so SDK provenance and emitted recipes are checked together.
run(swiftc, [
  '-typecheck',
  '-sdk',
  sdk,
  '-target',
  `arm64-apple-ios${MINIMUM_IOS}.0-simulator`,
  ...['ios', 'ios/Generated'].flatMap((dir) =>
    readdirSync(join(root, dir))
      .filter((file) => file.endsWith('.swift'))
      .map((file) => join(root, dir, file))
  ),
])
run(swiftc, [
  '-sdk',
  run('xcrun', ['--sdk', 'macosx', '--show-sdk-path']),
  join(root, 'ios/OneNativeControlled.swift'),
  join(root, 'codegen/VerifyControlled.swift'),
  '-o',
  join(cache, 'verify-controlled'),
])
console.log(run(join(cache, 'verify-controlled'), []))
console.log(
  `SwiftUI SDK ${sdkVersion}, target ${MAXIMUM_IOS}: ${inventory.length} declarations, ${selected.length} mapped symbols, ${outputs.size} generated files${process.argv.includes('--check') ? ', verified' : ''}`
)
