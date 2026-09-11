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
] as const

export const hostAxes = ['vertical', 'horizontal'] as const
export const hostAlignments = ['leading', 'center', 'trailing'] as const

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
export interface HostProps extends ViewProps {
  axis?: HostAxis
  spacing?: number
  alignment?: HostAlignment
  children: ReactNode
}
export interface FormProps extends ViewProps {
  children: ReactNode
}
export interface SectionProps extends ViewProps {
  title?: string
  footer?: string
  children: ReactNode
}
export const hostAxes = [${hostAxes.map((axis) => JSON.stringify(axis)).join(', ')}] as const
export const hostAlignments = [${hostAlignments.map((value) => JSON.stringify(value)).join(', ')}] as const
`
  )
}
