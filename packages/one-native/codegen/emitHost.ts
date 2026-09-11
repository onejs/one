// the host is structural rather than an SDK binding: it composes already-generated
// controls into one SwiftUI tree and reports the height it measured back to Yoga.
export const hostComponents = [
  {
    name: 'OneNativeHost',
    publicName: 'Host',
    props: { axis: 'string', spacing: 'Double', alignment: 'string' },
    events: {},
    enumProps: {},
    layout: { kind: 'measured' },
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
] as const

export const hostAxes = ['vertical', 'horizontal'] as const
export const hostAlignments = ['leading', 'center', 'trailing'] as const

export function emitHost(header: string, outputs: Map<string, string>) {
  for (const component of hostComponents)
    outputs.set(
      `src/specs/${component.name}NativeComponent.ts`,
      header +
        `import type { ViewProps } from 'react-native'
import type { Double } from 'react-native/Libraries/Types/CodegenTypes'
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent'
interface NativeProps extends ViewProps {
${Object.entries(component.props)
  .map(([key, type]) => `  ${key}: ${type}`)
  .join('\n')}
}
export default codegenNativeComponent<NativeProps>('${component.name}', { interfaceOnly: true })
`
    )
  outputs.set(
    'src/generated/hostTypes.ts',
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
export const hostAxes = [${hostAxes.map((axis) => JSON.stringify(axis)).join(', ')}] as const
export const hostAlignments = [${hostAlignments.map((value) => JSON.stringify(value)).join(', ')}] as const
`
  )
}
