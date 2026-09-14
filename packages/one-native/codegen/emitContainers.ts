// containers are structural rather than SDK bindings: they compose already-generated
// controls into one SwiftUI tree. a host reports the height SwiftUI measured back to
// Yoga; a form and a section lay out inside whatever box React Native gives them.
const composedContent = {
  name: 'content',
  content: 'one-native',
  cardinality: 'many',
  layout: 'composed',
} as const

export const containerComponents = [
  {
    name: 'OneNativeHost',
    publicName: 'Host',
    props: { axis: 'string', spacing: 'Double', alignment: 'string' },
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
    // measured like a host, so it owns a hand-written shadow node too.
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
    props: {},
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
// SwiftUI's own Alignment statics, in the order the SDK declares them. each one needs a
// case in the ZStack view's switch, so add a value here and there together.
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

export function emitContainers(header: string, outputs: Map<string, string>) {
  for (const component of containerComponents) {
    const props = Object.entries(component.props)
    outputs.set(
      `src/specs/${component.name}NativeComponent.ts`,
      header +
        `import type { ViewProps } from 'react-native'
${props.some(([, type]) => type === 'Double') ? `import type { Double } from 'react-native/Libraries/Types/CodegenTypes'\n` : ''}import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent'
interface NativeProps extends ViewProps {
${props.map(([key, type]) => `  ${key}: ${type}`).join('\n')}
}
export default codegenNativeComponent<NativeProps>('${component.name}'${component.interfaceOnly ? ', { interfaceOnly: true }' : ''})
`
    )
  }
  outputs.set(
    'src/generated/containerTypes.ts',
    header +
      `import type { ReactNode } from 'react'
import type { ViewProps } from 'react-native'
export type HostAxis = ${hostAxes.map((axis) => JSON.stringify(axis)).join(' | ')}
export type HostAlignment = ${hostAlignments.map((value) => JSON.stringify(value)).join(' | ')}
export type ZStackAlignment = ${zStackAlignments.map((value) => JSON.stringify(value)).join(' | ')}
export interface HostProps extends ViewProps {
  axis?: HostAxis
  spacing?: number
  alignment?: HostAlignment
  children: ReactNode
}
// Swift.HStack and Swift.VStack are Swift.Host with the axis fixed, so their props are a
// host's without it.
export type StackProps = Omit<HostProps, 'axis'>
export interface ZStackProps extends ViewProps {
  alignment?: ZStackAlignment
  children: ReactNode
}
export interface SpacerProps extends ViewProps {
  minLength?: number
}
export interface FormProps extends ViewProps {
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
export const zStackAlignments = [${zStackAlignments.map((value) => JSON.stringify(value)).join(', ')}] as const
`
  )
}
