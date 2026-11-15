import type { StyleField } from './catalog'

// a popover is both halves at once: the trigger is inline content that lays out with
// the React Native tree, and the body is presented outside the surface like a sheet's.
export const popoverMethods = [
  {
    name: 'popover',
    parameters: [
      { label: 'isPresented', type: 'SwiftUICore.Binding<Swift.Bool>' },
      { label: 'attachmentAnchor', type: 'SwiftUI.PopoverAttachmentAnchor' },
      { label: 'arrowEdge', type: 'SwiftUICore.Edge?' },
      { label: 'content', type: '@escaping () -> Content' },
    ],
    requirements: ['Content: SwiftUICore.View'],
  },
]
export const popoverComponents = [
  {
    name: 'OneNativePopover',
    publicName: 'Popover',
    props: {
      isPresented: 'boolean',
      acknowledgedEvent: 'Int32',
      revision: 'Int32',
      arrowEdge: 'string',
      presentationCompactAdaptation: 'string',
    },
    events: {
      onNativePopoverIsPresentedChange: {
        isPresented: 'boolean',
        eventCount: 'Int32',
        revision: 'Int32',
      },
      onNativeSDKEvent: { name: 'string', value: 'string' },
    },
    // the trigger stack takes every scalar modifier the way any other view does.
    swiftStyle: true,
    enumProps: {
      arrowEdge: 'Edge',
      presentationCompactAdaptation: 'PresentationAdaptation',
    },
    controlled: { value: 'isPresented', event: 'onNativePopoverIsPresentedChange' },
    layout: { kind: 'measured' },
    slots: [
      { name: 'trigger', content: 'one-native', cardinality: 'many', layout: 'composed' },
      {
        name: 'content',
        content: 'OneNativePopoverContent',
        cardinality: 'one',
        layout: 'presented',
      },
    ],
    // the trigger reports the height SwiftUI measured through its generated shadow node
    interfaceOnly: true,
    host: {
      modifier: 'popover',
      // the popover anchors to the trigger's own bounds, so the stack hugs it
      childStack: 'VStack(alignment: .leading, spacing: 0)',
      binding: { label: 'isPresented', prop: 'isPresented', event: 'onNativePopoverIsPresentedChange' },
      arguments: { arrowEdge: 'arrowEdge' },
      presented: {
        label: 'content',
        slot: 'OneNativePopoverContent',
        // SwiftUI sizes a popover from its content, whose measured size the
        // bridge reports back as the slot's ideal size
        modifiers: ['.oneNativePresentationCompactAdaptation(@presentationCompactAdaptation)'],
      },
      // the trigger sits at the leading edge, as a host's content does
      modifiers: ['.frame(maxWidth: .infinity, alignment: .leading)'],
      layout: 'measured',
    },
  },
  {
    name: 'OneNativePopoverContent',
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
    interfaceOnly: true,
    host: { slot: 'presented' },
  },
] as const

export function emitPopover(
  header: string,
  outputs: Map<string, string>,
  styleFields: readonly StyleField[]
) {
  for (const component of popoverComponents) {
    const props = Object.entries(component.props)
    const styled = 'swiftStyle' in component && component.swiftStyle === true
    outputs.set(
      `src/platform/specs/${component.name}NativeComponent.ts`,
      header +
        `import type { ${styled ? 'ProcessedColorValue, ' : ''}ViewProps } from 'react-native'
import type { DirectEventHandler, Int32, Double${styled ? ', WithDefault' : ''} } from 'react-native/Libraries/Types/CodegenTypes'
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent'
${styled ? `type OneNativeStyleNative = Readonly<{\n${styleFields.map((field) => `  ${field.name}?: ${field.kind === 'number' ? 'WithDefault<Double, -1>' : field.kind === 'boolean' ? 'boolean' : field.kind === 'color' ? 'ProcessedColorValue' : 'string'}`).join('\n')}\n  sdkModifiers?: string\n}>\n` : ''}interface NativeProps extends ViewProps {
${props.map(([key, type]) => `  ${key}: ${type}`).join('\n')}
${styled ? '  swiftStyle?: OneNativeStyleNative\n' : ''}${Object.entries(component.events)
  .map(
    ([key, fields]) =>
      `  ${key}?: DirectEventHandler<Readonly<{ ${Object.entries(fields)
        .map(([key, type]) => `${key}: ${type}`)
        .join('; ')} }>>`
  )
  .join('\n')}
}
export default codegenNativeComponent<NativeProps>('${component.name}'${component.interfaceOnly ? ', { interfaceOnly: true }' : ''})
`
    )
  }
  outputs.set(
    'src/platform/generated/popoverTypes.ts',
    header +
      `import type { ReactNode } from 'react'
import type { ViewProps } from 'react-native'
import type { OneNativeStyle } from './controlTypes'
import type { Edge, PresentationAdaptation } from './swiftui'
export interface PopoverProps extends ViewProps {
  swiftStyle?: OneNativeStyle
  isPresented: boolean
  onIsPresentedChange: (value: boolean) => void
  revision?: number
  arrowEdge?: Edge
  presentationCompactAdaptation?: PresentationAdaptation
  content: ReactNode
  children: ReactNode
}
`
  )
}
