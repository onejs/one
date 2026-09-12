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
    name: 'presentationDetents',
    parameters: [{ label: '_', type: 'Swift.Set<SwiftUI.PresentationDetent>' }],
    requirements: [],
  },
  {
    name: 'presentationDetents',
    parameters: [
      { label: '_', type: 'Swift.Set<SwiftUI.PresentationDetent>' },
      { label: 'selection', type: 'SwiftUICore.Binding<SwiftUI.PresentationDetent>' },
    ],
    requirements: [],
  },
  {
    name: 'presentationBackground',
    parameters: [{ label: '_', type: 'S' }],
    requirements: ['S : SwiftUICore.ShapeStyle'],
  },
  {
    name: 'presentationBackgroundInteraction',
    parameters: [{ label: '_', type: 'SwiftUI.PresentationBackgroundInteraction' }],
    requirements: [],
  },
  {
    name: 'presentationContentInteraction',
    parameters: [{ label: '_', type: 'SwiftUI.PresentationContentInteraction' }],
    requirements: [],
  },
  {
    name: 'presentationSizing',
    parameters: [{ label: '_', type: 'some PresentationSizing' }],
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
      fitToContents: 'boolean',
      selectedDetentType: 'string',
      selectedDetentValue: 'Double',
      acknowledgedDetentEvent: 'Int32',
      detentRevision: 'Int32',
      interactiveDismissDisabled: 'boolean',
      presentationDragIndicator: 'string',
      presentationBackground: 'ColorValue',
      presentationBackgroundInteraction: 'string',
      presentationBackgroundInteractionDetentType: 'string',
      presentationBackgroundInteractionDetentValue: 'Double',
      presentationContentInteraction: 'string',
      presentationSizing: 'string',
    },
    events: {
      onNativeSheetIsPresentedChange: {
        isPresented: 'boolean',
        eventCount: 'Int32',
        revision: 'Int32',
      },
      onNativeSheetDismiss: { revision: 'Int32' },
      onNativeSheetDetentChange: {
        type: 'string',
        value: 'Double',
        eventCount: 'Int32',
        revision: 'Int32',
      },
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
    const usesColor = Object.values(component.props).includes('ColorValue')
    outputs.set(
      `src/specs/${component.name}NativeComponent.ts`,
      header +
        `import type { ${usesColor ? 'ColorValue, ' : ''}ViewProps } from 'react-native'
import type { DirectEventHandler, Int32, Double } from 'react-native/Libraries/Types/CodegenTypes'
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent'
${component.name === 'OneNativeSheet' ? 'type NativeSheetDetent = Readonly<{ type: string; value: Double }>' : ''}
interface NativeProps extends ViewProps {
${Object.entries(component.props)
  .map(([key, type]) => `  ${key}${key === 'presentationBackground' ? '?' : ''}: ${type}`)
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
import type { ColorValue, ViewProps } from 'react-native'
import type { PresentationContentInteraction, Visibility } from './swiftui'
export type PresentationDetent = 'medium' | 'large' | { fraction: number } | { height: number }
export type PresentationBackgroundInteraction =
  | 'automatic'
  | 'enabled'
  | 'disabled'
  | { enabledUpThrough: PresentationDetent }
export type PresentationSizing = 'automatic' | 'fitted' | 'form' | 'page'
export interface SheetProps extends ViewProps {
  isPresented: boolean
  onIsPresentedChange: (value: boolean) => void
  onDismiss?: () => void
  revision?: number
  presentationDetents?: readonly PresentationDetent[]
  fitToContents?: boolean
  selectedDetent?: PresentationDetent
  onSelectedDetentChange?: (detent: PresentationDetent) => void
  detentRevision?: number
  presentationDragIndicator?: Visibility
  interactiveDismissDisabled?: boolean
  presentationBackground?: ColorValue
  presentationBackgroundInteraction?: PresentationBackgroundInteraction
  presentationContentInteraction?: PresentationContentInteraction
  presentationSizing?: PresentationSizing
  children: ReactNode
}
`
  )
  outputs.set(
    'ios/Generated/OneNativeSheetContent.swift',
    header +
      `import SwiftUI
import UIKit
struct OneNativeSheetRoot: View {
  @ObservedObject var model: OneNativeSheetModel
  var body: some View {
    Color.clear
      .sheet(isPresented: Binding(get: { model.controlled.value && model.content != nil }, set: { model.change($0) }), onDismiss: { model.dismissed() }) {
        if let content = model.content {
          let slot = OneNativeSlot(content: content, mode: .presented, onLayout: { frame in
            if model.active && model.controlled.value { model.onLayout?(frame) }
          })
          if model.fitToContents {
            slot
              .frame(maxWidth: .infinity, maxHeight: .infinity)
              .oneNativeSheetPresentation(model, fitToContents: true)
          } else {
            slot
              .frame(maxWidth: .infinity, maxHeight: .infinity)
              .oneNativeSheetPresentation(model, fitToContents: false)
          }
        }
      }
  }
}

extension View {
  @ViewBuilder func oneNativeSheetPresentation(
    _ model: OneNativeSheetModel, fitToContents: Bool
  ) -> some View {
    if fitToContents {
      self
        .presentationDetents(model.fittedHeight > 0 ? [.height(model.fittedHeight)] : [.medium])
        .oneNativeSheetPresentationModifiers(model)
    } else {
      self
        .presentationDetents(model.detents, selection: Binding(
          get: { model.selectedPresentationDetent },
          set: { model.changeDetent($0) }
        ))
        .oneNativeSheetPresentationModifiers(model)
    }
  }

  @ViewBuilder func oneNativeSheetPresentationModifiers(
    _ model: OneNativeSheetModel
  ) -> some View {
    self
      .oneNativePresentationDragIndicator(model.presentationDragIndicator)
      .interactiveDismissDisabled(model.interactiveDismissDisabled)
      .oneNativePresentationBackground(model.presentationBackground)
      .oneNativePresentationBackgroundInteraction(
        model.presentationBackgroundInteraction,
        upThrough: model.presentationBackgroundInteractionDetent)
      .oneNativePresentationContentInteraction(model.presentationContentInteraction)
      .oneNativePresentationSizing(model.presentationSizing)
  }

  @ViewBuilder func oneNativePresentationBackground(_ value: UIColor?) -> some View {
    if let value { self.presentationBackground(Color(uiColor: value)) }
    else { self }
  }

  @ViewBuilder func oneNativePresentationBackgroundInteraction(
    _ value: String, upThrough detent: PresentationDetent
  ) -> some View {
    switch value {
    case "enabled": self.presentationBackgroundInteraction(.enabled)
    case "disabled": self.presentationBackgroundInteraction(.disabled)
    case "enabledUpThrough": self.presentationBackgroundInteraction(.enabled(upThrough: detent))
    default: self.presentationBackgroundInteraction(.automatic)
    }
  }

  @ViewBuilder func oneNativePresentationContentInteraction(_ value: String) -> some View {
    self.presentationContentInteraction(
      OneNativeGenerated.presentationContentInteraction(value))
  }

  @ViewBuilder func oneNativePresentationSizing(_ value: String) -> some View {
    switch value {
    case "fitted": self.presentationSizing(.fitted)
    case "form": self.presentationSizing(.form)
    case "page": self.presentationSizing(.page)
    default: self.presentationSizing(.automatic)
    }
  }
}
`
  )
}
