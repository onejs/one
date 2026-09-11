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
    },
    enumProps: { arrowEdge: 'Edge', presentationCompactAdaptation: 'PresentationAdaptation' },
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

export function emitPopover(header: string, outputs: Map<string, string>) {
  for (const component of popoverComponents) {
    const props = Object.entries(component.props)
    outputs.set(
      `src/specs/${component.name}NativeComponent.ts`,
      header +
        `import type { ViewProps } from 'react-native'
import type { DirectEventHandler, Int32, Double } from 'react-native/Libraries/Types/CodegenTypes'
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent'
interface NativeProps extends ViewProps {
${props.map(([key, type]) => `  ${key}: ${type}`).join('\n')}
${Object.entries(component.events)
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
    'src/generated/popoverTypes.ts',
    header +
      `import type { ReactNode } from 'react'
import type { ViewProps } from 'react-native'
import type { Edge, PresentationAdaptation } from './swiftui'
export interface PopoverProps extends ViewProps {
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
    .oneNativeMeasured(standalone, model.onHeight)
  }
}
`
  )
}
