// containers are structural rather than SDK bindings: they compose already-generated
// controls into one SwiftUI tree. a host reports the height SwiftUI measured back to
// Yoga; a form and a section lay out inside whatever box React Native gives them.
import type { StyleField } from './catalog'

const composedContent = {
  name: 'content',
  content: 'one-native',
  cardinality: 'many',
  layout: 'composed',
} as const

const environmentProps = {
  colorScheme: 'string',
  dynamicTypeSize: 'string',
  controlSize: 'string',
  locale: 'string',
  tint: 'ColorValue?',
  isEnabled: 'string',
} as const

export const environmentMethods = [
  {
    name: 'environment',
    parameters: [
      { label: '_', type: 'Swift.WritableKeyPath<SwiftUICore.EnvironmentValues, V>' },
      { label: '_', type: 'V' },
    ],
    requirements: [],
  },
]

export const containerComponents = [
  {
    name: 'OneNativeHost',
    publicName: 'Host',
    props: {
      axis: 'string',
      spacing: 'Double',
      alignment: 'string',
      ...environmentProps,
    },
    events: {},
    enumProps: {},
    layout: { kind: 'measured' },
    slots: [composedContent],
    // the measured height needs a hand-written shadow node, state and descriptor.
    interfaceOnly: true,
  },
  {
    name: 'OneNativeZStack',
    publicName: 'ZStack',
    props: { alignment: 'string' },
    events: {},
    enumProps: {},
    layout: { kind: 'measured' },
    slots: [composedContent],
    // the measured height needs a hand-written shadow node, state and descriptor.
    interfaceOnly: true,
  },
  {
    name: 'OneNativeSpacer',
    publicName: 'Spacer',
    props: { minLength: 'Double' },
    events: {},
    enumProps: {},
    layout: { kind: 'container' },
    // a spacer holds nothing; it takes the free space its parent stack offers.
    slots: [],
    interfaceOnly: false,
  },
  {
    name: 'OneNativeForm',
    publicName: 'Form',
    props: { sizing: 'string', ...environmentProps },
    events: {},
    enumProps: {},
    // fill takes the box React Native gave it; content reports the height SwiftUI
    // measured back to Yoga, so a form in a sheet wraps its rows.
    layout: { kind: 'measured' },
    slots: [composedContent],
    // the measured height needs a hand-written shadow node, state and descriptor.
    interfaceOnly: true,
  },
  {
    name: 'OneNativeSection',
    publicName: 'Section',
    props: { title: 'string', footer: 'string' },
    events: {},
    enumProps: {},
    layout: { kind: 'container' },
    slots: [composedContent],
    interfaceOnly: false,
  },
  {
    name: 'OneNativeLabeledContent',
    publicName: 'LabeledContent',
    props: { label: 'string', value: 'string', systemImage: 'string' },
    events: {},
    enumProps: {},
    // a row has an ideal height SwiftUI knows, so standalone it measures like a host.
    layout: { kind: 'measured' },
    slots: [composedContent],
    // the measured height needs a hand-written shadow node, state and descriptor.
    interfaceOnly: true,
  },
  {
    name: 'OneNativeButton',
    publicName: 'Button',
    // a button is a measured container: with children they are the label view, without
    // them the label props render text the way the leaf control did. the view and the
    // adapter are hand-written like every other container; the spec and schema stay
    // generated so the Fabric contract cannot drift.
    props: {
      label: 'string',
      disabled: 'boolean',
      subtitle: 'string',
      systemImage: 'string',
      buttonRole: 'string',
      buttonStyle: 'string',
      disclosureIndicator: 'boolean',
    },
    events: {
      onNativeButtonPress: { eventCount: 'Int32' },
      onNativeSDKEvent: { name: 'string', value: 'string' },
    },
    enumProps: {
      buttonRole: 'ButtonRole',
      buttonStyle: 'PrimitiveButtonStyle',
    },
    actions: [{ publicProp: 'onPress', event: 'onNativeButtonPress' }],
    layout: { kind: 'measured' },
    slots: [composedContent],
    // swiftStyle travels as its own struct prop like a generated control's, so a
    // standalone button keeps the fonts, colors, frame and chrome it always had.
    swiftStyle: true,
    // the measured height needs a hand-written shadow node, state and descriptor.
    interfaceOnly: true,
  },
  {
    name: 'OneNativeGlass',
    publicName: 'Glass',
    // a glass surface takes the box React Native gave it.
    props: {
      material: 'string?',
      glassEffect: 'string?',
      interactive: 'boolean?',
      shape: 'string?',
      cornerRadius: 'Double?',
      tint: 'ColorValue?',
    },
    events: {},
    enumProps: {},
    layout: { kind: 'container' },
    slots: [composedContent],
    interfaceOnly: false,
  },
  {
    name: 'OneNativeTabs',
    publicName: 'Tabs',
    props: {
      selection: 'string',
      tabViewStyle: 'string',
      tabBarVisibility: 'string',
      // TabViewCustomization as its Codable JSON; empty leaves customization unbound.
      customization: 'string',
      customizable: 'boolean',
      bottomAccessoryEnabled: 'boolean',
      acknowledgedEvent: 'Int32',
      revision: 'Int32',
    },
    events: {
      onNativeTabsSelectionChange: { selection: 'string', eventCount: 'Int32', revision: 'Int32' },
      // pressing an action tab is not a state change, so it carries no controlled event.
      onNativeTabsAction: { tabId: 'string' },
      onNativeTabsCustomizationChange: { customization: 'string' },
      onNativeSDKEvent: { name: 'string', value: 'string' },
    },
    enumProps: { tabViewStyle: 'TabViewStyle', tabBarVisibility: 'Visibility' },
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
    // tabBarMinimizeBehavior, tabViewSearchActivation, defaultTabBarPlacement and every
    // other scalar TabView modifier the SDK declares reach the TabView through swiftStyle.
    swiftStyle: true,
    interfaceOnly: false,
  },
  {
    name: 'OneNativeContainerSlot',
    publicName: 'Slot',
    props: { height: 'Double', width: 'Double' },
    events: {},
    enumProps: {},
    layout: { kind: 'container' },
    slots: [
      {
        name: 'content',
        content: 'react-native',
        cardinality: 'many',
        layout: 'swiftui-proposal-to-yoga',
      },
    ],
    // SwiftUI proposes the box and the shared slot shadow node writes it back to Yoga.
    interfaceOnly: true,
  },
  {
    name: 'OneNativeNavigationStack',
    publicName: 'NavigationStack',
    // the stack takes the box React Native gave it. its React Native children are the
    // stack's root, and the toolbar markers beside them fill the navigation bar.
    props: {},
    events: {
      onNativeSDKEvent: { name: 'string', value: 'string' },
    },
    enumProps: {},
    layout: { kind: 'container' },
    slots: [
      {
        name: 'toolbar',
        content: 'OneNativeToolbar',
        cardinality: 'many',
        layout: 'composed',
      },
      {
        name: 'content',
        content: 'OneNativeNavigationStackContent',
        cardinality: 'one',
        layout: 'swiftui-proposal-to-yoga',
        origin: 'local',
      },
    ],
    // navigationTitle, navigationBarTitleDisplayMode, toolbarBackground and every other
    // scalar navigation or toolbar modifier reach the stack through swiftStyle.
    swiftStyle: true,
    interfaceOnly: false,
  },
  {
    name: 'OneNativeToolbar',
    publicName: 'Toolbar',
    // a marker: its ToolbarItem children publish into the navigation bar of the
    // NavigationStack that hosts it, and nothing renders where it sits.
    props: {},
    events: {},
    enumProps: {},
    layout: { kind: 'container' },
    slots: [composedContent],
    interfaceOnly: false,
  },
  {
    name: 'OneNativeToolbarItem',
    publicName: 'ToolbarItem',
    props: { placement: 'string' },
    events: {
      onNativeSDKEvent: { name: 'string', value: 'string' },
    },
    enumProps: { placement: 'ToolbarItemPlacement' },
    layout: { kind: 'container' },
    slots: [composedContent],
    // the item's content is a SwiftUI view, so it takes every scalar modifier too.
    swiftStyle: true,
    interfaceOnly: false,
  },
  {
    name: 'OneNativeToolbarItemGroup',
    publicName: 'ToolbarItemGroup',
    // a labelled group is the SDK's own labelled ToolbarItemGroup initializer, so the
    // label renders the way SwiftUI renders it rather than a row of the item's views.
    props: { placement: 'string', label: 'string', systemImage: 'string' },
    events: {
      onNativeSDKEvent: { name: 'string', value: 'string' },
    },
    enumProps: { placement: 'ToolbarItemPlacement' },
    layout: { kind: 'container' },
    slots: [composedContent],
    swiftStyle: true,
    interfaceOnly: false,
  },
  {
    name: 'OneNativeToolbarSpacer',
    publicName: 'ToolbarSpacer',
    // a spacer holds nothing; it takes the space SwiftUI gives it between toolbar items.
    props: { sizing: 'string', placement: 'string' },
    events: {},
    enumProps: { sizing: 'SpacerSizing', placement: 'ToolbarItemPlacement' },
    layout: { kind: 'container' },
    slots: [],
    interfaceOnly: false,
  },
] as const

// a container whose only job is to carry a React Native subtree into a SwiftUI box the
// parent proposes. it has no public entry point, so it stays off the container surface.
export const contentComponents = [
  {
    name: 'OneNativeNavigationStackContent',
    publicName: null,
    props: {},
    events: {},
    enumProps: {},
    layout: { kind: 'container' },
    slots: [
      {
        name: 'content',
        content: 'react-native',
        cardinality: 'many',
        layout: 'swiftui-proposal-to-yoga',
        origin: 'local',
      },
    ],
    // SwiftUI proposes the root box and the hand-written slot shadow node writes it back.
    interfaceOnly: true,
  },
] as const

export const hostAxes = ['vertical', 'horizontal'] as const
export const hostAlignments = ['leading', 'center', 'trailing'] as const
export const zStackAlignments = [
  'topLeading',
  'top',
  'topTrailing',
  'leading',
  'center',
  'trailing',
  'bottomLeading',
  'bottom',
  'bottomTrailing',
] as const

export function emitContainers(
  header: string,
  outputs: Map<string, string>,
  styleFields: readonly StyleField[]
) {
  for (const component of [...containerComponents, ...contentComponents]) {
    const props = Object.entries(component.props).map(([key, declared]) => ({
      key,
      optional: declared.endsWith('?'),
      type: declared.replace('?', ''),
    }))
    const eventEntries = Object.entries(component.events)
    // only a container that keeps control chrome carries swiftStyle as its own struct
    // prop; every other container styles through its children or not at all.
    const styled = 'swiftStyle' in component && component.swiftStyle === true
    const reactNativeTypes = [
      ...(props.some(({ type }) => type === 'ColorValue') ? ['ColorValue'] : []),
      ...(styled ? ['ProcessedColorValue'] : []),
      'ViewProps',
    ]
    const codegenTypes = [
      ...new Set([
        ...(eventEntries.length ? ['DirectEventHandler', 'Int32'] : []),
        ...(props.some(({ type }) => type === 'Double') || styled ? ['Double'] : []),
        ...(styled ? ['WithDefault'] : []),
      ]),
    ]
    outputs.set(
      `src/specs/${component.name}NativeComponent.ts`,
      header +
        `import type { ${reactNativeTypes.join(', ')} } from 'react-native'
${codegenTypes.length ? `import type { ${codegenTypes.join(', ')} } from 'react-native/Libraries/Types/CodegenTypes'\n` : ''}import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent'
${styled ? `type OneNativeStyleNative = Readonly<{\n${styleFields.map((field) => `  ${field.name}?: ${field.kind === 'number' ? 'WithDefault<Double, -1>' : field.kind === 'boolean' ? 'boolean' : field.kind === 'color' ? 'ProcessedColorValue' : 'string'}`).join('\n')}\n  sdkModifiers?: string\n}>\n` : ''}interface NativeProps extends ViewProps {
${props.map(({ key, optional, type }) => `  ${key}${optional ? '?' : ''}: ${type}`).join('\n')}
${styled ? '  swiftStyle?: OneNativeStyleNative\n' : ''}${eventEntries.map(([name, fields]) => `  ${name}?: DirectEventHandler<\n    Readonly<{ ${Object.entries(fields as Record<string, string>).map(([field, type]) => `${field}: ${type}`).join('; ')} }>\n  >`).join('\n')}
}
export default codegenNativeComponent<NativeProps>('${component.name}'${component.interfaceOnly ? ', { interfaceOnly: true }' : ''})
`
    )
  }
  outputs.set(
    'src/generated/containerTypes.ts',
    header +
      `import type { ReactNode } from 'react'
import type { ColorValue, ViewProps } from 'react-native'
import type { GlassEffect, GlassEffectShape, Material, OneNativeViewProps } from './controlTypes'
import type * as Styles from './swiftui'
import type { ColorScheme, ControlSize, DynamicTypeSize, SpacerSizing, ToolbarItemPlacement } from './swiftui'
export type HostAxis = ${hostAxes.map((axis) => JSON.stringify(axis)).join(' | ')}
export type HostAlignment = ${hostAlignments.map((value) => JSON.stringify(value)).join(' | ')}
export type ZStackAlignment = ${zStackAlignments.map((value) => JSON.stringify(value)).join(' | ')}
export interface EnvironmentProps {
  colorScheme?: ColorScheme
  dynamicTypeSize?: DynamicTypeSize
  controlSize?: ControlSize
  locale?: string
  tint?: ColorValue
  isEnabled?: boolean
}
export interface HostProps extends ViewProps, EnvironmentProps {
  axis?: HostAxis
  spacing?: number
  alignment?: HostAlignment
  children: ReactNode
}
export type StackProps = Omit<HostProps, 'axis'>
export interface ZStackProps extends ViewProps {
  alignment?: ZStackAlignment
  children: ReactNode
}
export interface SpacerProps extends ViewProps {
  minLength?: number
}
export type FormSizing = 'fill' | 'content'
export interface FormProps extends ViewProps, EnvironmentProps {
  sizing?: FormSizing
  children: ReactNode
}
export interface SectionProps extends ViewProps {
  title?: string
  footer?: string
  children: ReactNode
}
export interface LabeledContentProps extends ViewProps {
  label: string
  value?: string
  systemImage?: string
  children?: ReactNode
}
export interface ButtonProps extends OneNativeViewProps {
  onPress?: () => void
  label?: string
  disabled?: boolean
  subtitle?: string
  systemImage?: string
  buttonRole?: Styles.ButtonRole | ''
  buttonStyle?: Styles.PrimitiveButtonStyle
  disclosureIndicator?: boolean
  children?: ReactNode
}
export interface GlassProps extends ViewProps {
  material?: Material
  glassEffect?: GlassEffect
  interactive?: boolean
  shape?: GlassEffectShape
  cornerRadius?: number
  tint?: ColorValue
  children: ReactNode
}
export interface SlotProps extends ViewProps {
  height: number
  width?: number
  children: ReactNode
}
export interface NavigationStackProps extends OneNativeViewProps {
  children: ReactNode
}
export interface ToolbarProps extends ViewProps {
  children: ReactNode
}
export interface ToolbarItemProps extends OneNativeViewProps {
  placement?: ToolbarItemPlacement
  children: ReactNode
}
export interface ToolbarItemGroupProps extends OneNativeViewProps {
  placement?: ToolbarItemPlacement
  label?: string
  systemImage?: string
  children: ReactNode
}
export interface ToolbarSpacerProps extends ViewProps {
  sizing?: SpacerSizing
  placement?: ToolbarItemPlacement
}
export const hostAxes = [${hostAxes.map((axis) => JSON.stringify(axis)).join(', ')}] as const
export const hostAlignments = [${hostAlignments.map((value) => JSON.stringify(value)).join(', ')}] as const
export const zStackAlignments = [${zStackAlignments.map((value) => JSON.stringify(value)).join(', ')}] as const
`
  )
  outputs.set(
    'ios/Generated/OneNativeEnvironment.swift',
    header +
      `import SwiftUI
import UIKit

final class OneNativeEnvironmentModel: ObservableObject {
  @Published var colorScheme = ""
  @Published var dynamicTypeSize = ""
  @Published var controlSize = ""
  @Published var locale = ""
  @Published var tint: UIColor?
  @Published var isEnabled = ""

  func configure(
    colorScheme: String, dynamicTypeSize: String, controlSize: String, locale: String,
    tint: UIColor?, isEnabled: String
  ) {
    if self.colorScheme != colorScheme { self.colorScheme = colorScheme }
    if self.dynamicTypeSize != dynamicTypeSize { self.dynamicTypeSize = dynamicTypeSize }
    if self.controlSize != controlSize { self.controlSize = controlSize }
    if self.locale != locale { self.locale = locale }
    if self.tint != tint { self.tint = tint }
    if self.isEnabled != isEnabled { self.isEnabled = isEnabled }
  }

  func reset() {
    colorScheme = ""
    dynamicTypeSize = ""
    controlSize = ""
    locale = ""
    tint = nil
    isEnabled = ""
  }
}

struct OneNativeEnvironment<Content: View>: View {
  @ObservedObject var model: OneNativeEnvironmentModel
  let content: Content

  var body: some View {
    content
      .oneNativeColorScheme(model.colorScheme)
      .oneNativeDynamicTypeSize(model.dynamicTypeSize)
      .oneNativeControlSize(model.controlSize)
      .oneNativeLocale(model.locale)
      .oneNativeEnvironmentTint(model.tint)
      .oneNativeIsEnabled(model.isEnabled)
  }
}

extension View {
  @ViewBuilder func oneNativeColorScheme(_ value: String) -> some View {
    if value.isEmpty { self }
    else { self.environment(\\.colorScheme, OneNativeGenerated.colorScheme(value)) }
  }

  @ViewBuilder func oneNativeDynamicTypeSize(_ value: String) -> some View {
    if value.isEmpty { self }
    else { self.environment(\\.dynamicTypeSize, OneNativeGenerated.dynamicTypeSize(value)) }
  }

  @ViewBuilder func oneNativeControlSize(_ value: String) -> some View {
    if value.isEmpty { self }
    else { self.environment(\\.controlSize, OneNativeGenerated.controlSize(value)) }
  }

  @ViewBuilder func oneNativeLocale(_ value: String) -> some View {
    if value.isEmpty { self }
    else { self.environment(\\.locale, Locale(identifier: value)) }
  }

  @ViewBuilder func oneNativeEnvironmentTint(_ value: UIColor?) -> some View {
    if let value { self.tint(Color(uiColor: value)) }
    else { self }
  }

  @ViewBuilder func oneNativeIsEnabled(_ value: String) -> some View {
    if value.isEmpty { self }
    else { self.environment(\\.isEnabled, value == "enabled") }
  }
}
`
  )
}
