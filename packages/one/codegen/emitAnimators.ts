// SwiftUI PhaseAnimator and KeyframeAnimator. JavaScript evaluates the content
// closure at sample phases or values and the native view runs the SwiftUI
// animator, so interpolation and timing are SwiftUI's. the props are private
// transport for the closures' results.
const composedContent = {
  name: 'content',
  content: 'one-native',
  cardinality: 'many',
  layout: 'composed',
} as const

export const animatorComponents = [
  {
    name: 'OneNativePhaseAnimator',
    publicName: 'PhaseAnimator',
    props: { animatorId: 'Int32', animations: 'string', hasTrigger: 'boolean', trigger: 'Int32' },
    events: {},
    enumProps: {},
    layout: { kind: 'container' },
    slots: [composedContent],
    interfaceOnly: false,
  },
  {
    name: 'OneNativeKeyframeAnimator',
    publicName: 'KeyframeAnimator',
    props: {
      animatorId: 'Int32',
      initialValue: 'string',
      tracks: 'string',
      repeating: 'boolean',
      hasTrigger: 'boolean',
      trigger: 'Int32',
    },
    events: {},
    enumProps: {},
    layout: { kind: 'container' },
    slots: [composedContent],
    interfaceOnly: false,
  },
] as const

export function emitAnimators(header: string, outputs: Map<string, string>) {
  for (const component of animatorComponents) {
    outputs.set(
      `src/platform/specs/${component.name}NativeComponent.ts`,
      header +
        `import type { ViewProps } from 'react-native'
import type { Int32 } from 'react-native/Libraries/Types/CodegenTypes'
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent'
interface NativeProps extends ViewProps {
${Object.entries(component.props)
  .map(([key, type]) => `  ${key}: ${type}`)
  .join('\n')}
}
export default codegenNativeComponent<NativeProps>('${component.name}')
`
    )
  }
}
