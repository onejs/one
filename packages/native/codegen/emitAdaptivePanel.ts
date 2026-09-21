// adaptive panel: compact bottom sheet to regular leading sidebar, one caller api.
// ios presents a nonmodal sheet (.presentationBackgroundInteraction(.enabled)) in
// compact and a nonmodal navigation split sidebar in regular, switching on
// horizontalSizeClass with one react native content view so react state survives
// adaptation. regularWidth is optional: absent means the system picks the sidebar
// width, present overrides it. android mirrors it with a coordinatorlayout host:
// bottomsheetbehavior in compact (window width < 600dp) and a material 3 side
// sheet in regular (default 360dp, max 400dp per material 3).
export const adaptivePanelMethods = [
  {
    name: 'navigationSplitViewColumnWidth',
    parameters: [{ label: '_', type: 'CoreFoundation.CGFloat' }],
    requirements: [],
  },
]
export const adaptivePanelComponents = [
  {
    name: 'OneNativeAdaptivePanel',
    publicName: 'AdaptivePanel',
    props: {
      open: 'boolean',
      acknowledgedEvent: 'Int32',
      revision: 'Int32',
      compactDetents: 'ReadonlyArray<NativeAdaptivePanelDetent>',
      selectedDetentType: 'string',
      selectedDetentValue: 'Double',
      acknowledgedDetentEvent: 'Int32',
      detentRevision: 'Int32',
      regularWidth: 'Double?',
    },
    events: {
      onNativeAdaptivePanelOpenChange: {
        open: 'boolean',
        eventCount: 'Int32',
        revision: 'Int32',
      },
      onNativeAdaptivePanelDetentChange: {
        type: 'string',
        value: 'Double',
        eventCount: 'Int32',
        revision: 'Int32',
      },
      onNativeAdaptivePanelLayoutChange: {
        placement: '"hidden" | "compact" | "regular"',
        frameX: 'Double',
        frameY: 'Double',
        frameWidth: 'Double',
        frameHeight: 'Double',
      },
    },
    controlled: { value: 'open', event: 'onNativeAdaptivePanelOpenChange' },
    layout: { kind: 'presentation' },
    slots: [
      {
        name: 'content',
        content: 'OneNativeAdaptivePanelContent',
        cardinality: 'one',
        layout: 'presented',
      },
    ],
    interfaceOnly: false,
  },
  {
    name: 'OneNativeAdaptivePanelContent',
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

export function emitAdaptivePanel(header: string, outputs: Map<string, string>) {
  for (const component of adaptivePanelComponents) {
    const props = Object.entries(component.props).map(([key, declared]) => ({
      key,
      optional: (declared as string).endsWith('?'),
      type: (declared as string).replace('?', ''),
    }))
    outputs.set(
      `src/specs/${component.name}NativeComponent.ts`,
      header +
        `import type { ViewProps } from 'react-native'
import type { DirectEventHandler, Int32, Double } from 'react-native/Libraries/Types/CodegenTypes'
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent'
${component.name === 'OneNativeAdaptivePanel' ? 'type NativeAdaptivePanelDetent = Readonly<{ type: string; value: Double }>' : ''}
interface NativeProps extends ViewProps {
${props.map(({ key, optional, type }) => `  ${key}${optional ? '?' : ''}: ${type}`).join('\n')}
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
}
