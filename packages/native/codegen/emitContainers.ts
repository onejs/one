// containers are structural rather than SDK bindings: they compose already-generated
// controls into one SwiftUI tree. a host reports the height SwiftUI measured back to
// Yoga; a form and a section lay out inside whatever box React Native gives them.
const composedContent = {
  name: 'content',
  content: 'one-native',
  cardinality: 'many',
  layout: 'composed',
} as const

const environmentProps = {
  colorScheme: 'string',
  dynamicTypeSize: 'string',
  locale: 'string',
  tint: 'ColorValue',
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
    name: 'OneNativeForm',
    publicName: 'Form',
    props: environmentProps,
    events: {},
    enumProps: {},
    layout: { kind: 'container' },
    slots: [composedContent],
    interfaceOnly: false,
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
] as const

export const hostAxes = ['vertical', 'horizontal'] as const
export const hostAlignments = ['leading', 'center', 'trailing'] as const

export function emitContainers(header: string, outputs: Map<string, string>) {
  for (const component of containerComponents) {
    const props = Object.entries(component.props)
    const reactNativeTypes = [
      ...(props.some(([, type]) => type === 'ColorValue') ? ['ColorValue'] : []),
      'ViewProps',
    ]
    outputs.set(
      `src/specs/${component.name}NativeComponent.ts`,
      header +
        `import type { ${reactNativeTypes.join(', ')} } from 'react-native'
${props.some(([, type]) => type === 'Double') ? `import type { Double } from 'react-native/Libraries/Types/CodegenTypes'\n` : ''}import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent'
interface NativeProps extends ViewProps {
${props.map(([key, type]) => `  ${key}${key === 'tint' ? '?' : ''}: ${type}`).join('\n')}
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
import type { ColorScheme, DynamicTypeSize } from './swiftui'
export type HostAxis = ${hostAxes.map((axis) => JSON.stringify(axis)).join(' | ')}
export type HostAlignment = ${hostAlignments.map((value) => JSON.stringify(value)).join(' | ')}
export interface EnvironmentProps {
  colorScheme?: ColorScheme
  dynamicTypeSize?: DynamicTypeSize
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
export interface FormProps extends ViewProps, EnvironmentProps {
  children: ReactNode
}
export interface SectionProps extends ViewProps {
  title?: string
  footer?: string
  children: ReactNode
}
export interface SlotProps extends ViewProps {
  height: number
  width?: number
  children: ReactNode
}
export const hostAxes = [${hostAxes.map((axis) => JSON.stringify(axis)).join(', ')}] as const
export const hostAlignments = [${hostAlignments.map((value) => JSON.stringify(value)).join(', ')}] as const
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
  @Published var locale = ""
  @Published var tint: UIColor?
  @Published var isEnabled = ""

  func configure(
    colorScheme: String, dynamicTypeSize: String, locale: String, tint: UIColor?,
    isEnabled: String
  ) {
    if self.colorScheme != colorScheme { self.colorScheme = colorScheme }
    if self.dynamicTypeSize != dynamicTypeSize { self.dynamicTypeSize = dynamicTypeSize }
    if self.locale != locale { self.locale = locale }
    if self.tint != tint { self.tint = tint }
    if self.isEnabled != isEnabled { self.isEnabled = isEnabled }
  }

  func reset() {
    colorScheme = ""
    dynamicTypeSize = ""
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
