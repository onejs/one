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
      contentWidth: 'Double',
      contentHeight: 'Double',
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
    // the trigger reports the height SwiftUI measured, which needs a hand-written
    // shadow node, state and descriptor.
    interfaceOnly: true,
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
  contentWidth: number
  contentHeight: number
  content: ReactNode
  children: ReactNode
}
`
  )
  outputs.set(
    'ios/Generated/OneNativePopoverContent.swift',
    header +
      `import SwiftUI

struct OneNativePopoverRoot: View {
  @ObservedObject var model: OneNativePopoverModel
  @ObservedObject var children: OneNativeChildren
  @ObservedObject var style: OneNativeContainerStyle
  // composed, the parent lays the trigger out and measures it; only a standalone
  // popover answers to Yoga.
  let standalone: Bool
  var body: some View {
    VStack(alignment: .leading, spacing: 0) {
      ForEach(children.items) { child in child.content }
    }
    .popover(
      isPresented: Binding(
        get: { model.controlled.value && model.content != nil },
        set: { value in model.change(value) }
      ),
      arrowEdge: OneNativeGenerated.edge(model.arrowEdge)
    ) {
      if let content = model.content {
        // SwiftUI sizes a popover from its content and a React Native subtree has no
        // ideal size, so the box is explicit.
        OneNativeSlot(content: content, mode: .presented, onLayout: { frame in
          if model.active && model.controlled.value { model.onLayout?(frame) }
        })
        .frame(width: model.contentWidth, height: model.contentHeight)
        .oneNativePresentationCompactAdaptation(model.presentationCompactAdaptation)
      }
    }
    // the popover anchors to the trigger's own bounds, so the stack hugs it and this
    // outer frame is what puts the trigger at the leading edge, as a host does.
    .frame(maxWidth: .infinity, alignment: .leading)
    .oneNativeContainerStyle(style)
    .oneNativeMeasured(standalone, model.onHeight)
  }
}
`
  )
}
