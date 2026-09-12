export const sheetMethods = [
  {
    name: 'sheet',
    parameters: [
      { label: 'isPresented', type: 'SwiftUICore.Binding<Swift.Bool>' },
      { label: 'onDismiss', type: '(() -> Swift.Void)?' },
      { label: 'content', type: '@escaping () -> Content' },
    ],
    requirements: ['Content: SwiftUICore.View'],
  },
  {
    // the same presentation with a different chrome: no detents, no drag indicator, and it
    // covers the screen. everything else, down to the presented slot, is the sheet's.
    name: 'fullScreenCover',
    parameters: [
      { label: 'isPresented', type: 'SwiftUICore.Binding<Swift.Bool>' },
      { label: 'onDismiss', type: '(() -> Swift.Void)?' },
      { label: 'content', type: '@escaping () -> Content' },
    ],
    requirements: ['Content: SwiftUICore.View'],
  },
  {
    name: 'presentationDetents',
    parameters: [{ label: '_', type: 'Swift.Set<SwiftUI.PresentationDetent>' }],
    requirements: [],
  },
  {
    name: 'interactiveDismissDisabled',
    parameters: [{ label: '_', type: 'Swift.Bool' }],
    requirements: [],
  },
]
export const sheetComponents = [
  {
    name: 'OneNativeSheet',
    publicName: 'Sheet',
    props: {
      isPresented: 'boolean',
      acknowledgedEvent: 'Int32',
      revision: 'Int32',
      detents: 'ReadonlyArray<NativeSheetDetent>',
      interactiveDismissDisabled: 'boolean',
      presentationDragIndicator: 'string',
      // 'sheet' or 'fullScreenCover'; Swift.Sheet and Swift.FullScreenCover are one
      // component because only the presenting modifier differs.
      presentation: 'string',
    },
    events: {
      onNativeSheetIsPresentedChange: {
        isPresented: 'boolean',
        eventCount: 'Int32',
        revision: 'Int32',
      },
      onNativeSheetDismiss: { revision: 'Int32' },
    },
    enumProps: { presentationDragIndicator: 'Visibility' },
    controlled: { value: 'isPresented', event: 'onNativeSheetIsPresentedChange' },
    layout: { kind: 'presentation' },
    slots: [
      {
        name: 'content',
        content: 'OneNativeSheetContent',
        cardinality: 'one',
        layout: 'presented',
      },
    ],
    interfaceOnly: false,
  },
  {
    name: 'OneNativeSheetContent',
    publicName: null,
    props: {},
    events: {},
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

export function emitSheet(header: string, outputs: Map<string, string>) {
  for (const component of sheetComponents) {
    outputs.set(
      `src/specs/${component.name}NativeComponent.ts`,
      header +
        `import type { ViewProps } from 'react-native'
import type { DirectEventHandler, Int32, Double } from 'react-native/Libraries/Types/CodegenTypes'
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent'
${component.name === 'OneNativeSheet' ? 'type NativeSheetDetent = Readonly<{ type: string; value: Double }>' : ''}
interface NativeProps extends ViewProps {
${Object.entries(component.props)
  .map(([key, type]) => `  ${key}: ${type}`)
  .join('\n')}
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
    'src/generated/sheetTypes.ts',
    header +
      `import type { ReactNode } from 'react'
import type { ViewProps } from 'react-native'
import type { Visibility } from './swiftui'
export type PresentationDetent = 'medium' | 'large' | { fraction: number } | { height: number }
export interface SheetProps extends ViewProps {
  isPresented: boolean
  onIsPresentedChange: (value: boolean) => void
  onDismiss?: () => void
  revision?: number
  presentationDetents?: readonly PresentationDetent[]
  presentationDragIndicator?: Visibility
  interactiveDismissDisabled?: boolean
  children: ReactNode
}
// a full screen cover has no detents and no drag indicator, so it takes neither. it is
// dismissed from React, or from a control the presented content supplies.
export interface FullScreenCoverProps extends ViewProps {
  isPresented: boolean
  onIsPresentedChange: (value: boolean) => void
  onDismiss?: () => void
  revision?: number
  children: ReactNode
}
`
  )
  outputs.set(
    'ios/Generated/OneNativeSheetContent.swift',
    header +
      `import SwiftUI
struct OneNativeSheetRoot: View {
  @ObservedObject var model: OneNativeSheetModel
  private var presented: Binding<Bool> {
    Binding(get: { model.controlled.value && model.content != nil }, set: { model.change($0) })
  }
  @ViewBuilder private var content: some View {
    if let content = model.content {
      OneNativeSlot(content: content, mode: .presented, onLayout: { frame in
        if model.active && model.controlled.value { model.onLayout?(frame) }
      })
      .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
  }
  var body: some View {
    if model.presentation == "fullScreenCover" {
      Color.clear
        .fullScreenCover(isPresented: presented, onDismiss: { model.dismissed() }) {
          content
        }
    } else {
      Color.clear
        .sheet(isPresented: presented, onDismiss: { model.dismissed() }) {
          content
            .presentationDetents(model.detents)
            .oneNativePresentationDragIndicator(model.presentationDragIndicator)
            .interactiveDismissDisabled(model.interactiveDismissDisabled)
        }
    }
  }
}
`
  )
}
