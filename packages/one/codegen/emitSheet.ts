import { ios, present, selectModifier, type Declaration } from './inventory'

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
      // 'sheet' or 'fullScreenCover'; Swift.Sheet and Swift.FullScreenCover are one
      // component because only the presenting modifier differs.
      presentation: 'string',
      // internal adapter appearance, without extending Swift.Sheet's public props.
      colorScheme: 'string',
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

// a React detent type to the PresentationDetent member that builds it. the strings
// are the sender contract (sheetTypes PresentationDetent, validated in Sheet.native);
// each member's existence, shape and availability are read from the SDK below. a
// `value` member takes no argument, a `scalar` member takes the detent's number.
export const sheetDetentMembers = [
  { type: 'medium', member: 'medium', kind: 'value' },
  { type: 'large', member: 'large', kind: 'value' },
  { type: 'fraction', member: 'fraction', kind: 'scalar' },
  { type: 'height', member: 'height', kind: 'scalar' },
] as const

// the sheet view configure selector in order: Swift label to the spec prop that
// fills it and the exact spec type the fixed model reads. the first label is
// `_`, so Fabric calls configure:.... the order and types are the
// cross-language contract; the model reads the same params.
export const sheetConfigureArgs = [
  { label: '_', prop: 'isPresented', type: 'boolean' },
  { label: 'acknowledgedEvent', prop: 'acknowledgedEvent', type: 'Int32' },
  { label: 'revision', prop: 'revision', type: 'Int32' },
  { label: 'selectedDetentType', prop: 'selectedDetentType', type: 'string' },
  { label: 'selectedDetentValue', prop: 'selectedDetentValue', type: 'Double' },
  { label: 'acknowledgedDetentEvent', prop: 'acknowledgedDetentEvent', type: 'Int32' },
  { label: 'detentRevision', prop: 'detentRevision', type: 'Int32' },
  { label: 'interactiveDismissDisabled', prop: 'interactiveDismissDisabled', type: 'boolean' },
  { label: 'presentationDragIndicator', prop: 'presentationDragIndicator', type: 'string' },
  { label: 'presentationBackground', prop: 'presentationBackground', type: 'ColorValue' },
  { label: 'presentationBackgroundInteraction', prop: 'presentationBackgroundInteraction', type: 'string' },
  { label: 'presentationBackgroundInteractionDetentType', prop: 'presentationBackgroundInteractionDetentType', type: 'string' },
  { label: 'presentationBackgroundInteractionDetentValue', prop: 'presentationBackgroundInteractionDetentValue', type: 'Double' },
  { label: 'presentationContentInteraction', prop: 'presentationContentInteraction', type: 'string' },
  { label: 'presentationSizing', prop: 'presentationSizing', type: 'string' },
  { label: 'presentation', prop: 'presentation', type: 'string' },
  { label: 'colorScheme', prop: 'colorScheme', type: 'string' },
] as const

type SheetSpec = {
  name: string
  props: Record<string, string>
  events: Record<string, Record<string, string>>
}

const swiftTypeOf = (prop: string, type: string) => {
  if (type === 'boolean') return 'Bool'
  if (type === 'Int32') return 'Int'
  if (type === 'Double') return 'Double'
  if (type === 'string') return 'String'
  if (type === 'ColorValue') return 'UIColor?'
  throw new Error(`OneNativeSheet host: ${prop} carries ${type}, which configure cannot take`)
}

const objcArgumentOf = (prop: string, type: string) => {
  if (type === 'string') return `RCTNSStringFromString(next.${prop})`
  if (type === 'ColorValue')
    return `next.${prop} ? RCTUIColorFromSharedColor(next.${prop}) : nil`
  if (type === 'boolean' || type === 'Int32' || type === 'Double') return `next.${prop}`
  throw new Error(`OneNativeSheet host: ${prop} carries ${type}, which configure cannot take`)
}

// the SDK facts the sheet glue emits against: the presentationDetents selection
// signature, every detent member's shape, and the spec surface the glue fills.
// anything missing, reshaped, or newer than the floor fails instead of emitting
// stale calls. the glue carries no availability gates: detents ship at iOS 16,
// below every floor that builds it.
export function validateSheetHost(
  inventory: readonly Declaration[],
  floor: number,
  ceiling: number,
  components: readonly SheetSpec[] = sheetComponents as unknown as readonly SheetSpec[]
) {
  const fail = (message: string): never => {
    throw new Error(`OneNativeSheet host: ${message}`)
  }
  const selector = sheetMethods.find(
    (method) => method.name === 'presentationDetents' && method.parameters.length === 2
  )
  if (!selector) fail('sheetMethods names no two-parameter presentationDetents')
  const detentsModifier = selectModifier(inventory, selector!)
  if (ios(detentsModifier) > floor)
    fail(`presentationDetents needs iOS ${ios(detentsModifier)}, past the floor ${floor}`)
  if (!sheetDetentMembers.some((entry) => entry.kind === 'value' && entry.member === 'large'))
    fail('sheet detents need their .large fallback')
  for (const { type, member, kind } of sheetDetentMembers) {
    const candidates = inventory.filter(
      (declaration) =>
        declaration.owner === 'PresentationDetent' &&
        declaration.name === member &&
        present(declaration) &&
        ios(declaration) <= ceiling
    )
    const matches = candidates.filter((declaration) =>
      kind === 'value'
        ? declaration.kind === 'static' &&
          declaration.parameters.length === 0 &&
          declaration.type === 'SwiftUI.PresentationDetent'
        : declaration.kind === 'func' &&
          declaration.isStatic &&
          declaration.parameters.length === 1 &&
          declaration.parameters[0].label === '_' &&
          declaration.parameters[0].type === 'CoreFoundation.CGFloat' &&
          declaration.type === 'SwiftUI.PresentationDetent'
    )
    if (matches.length !== 1)
      fail(
        `PresentationDetent has ${matches.length} ${kind === 'value' ? 'values' : 'scalar members'} named ${member} taking the ${type} shape`
      )
    if (ios(matches[0]) > floor)
      fail(`PresentationDetent.${member} needs iOS ${ios(matches[0])}, past the floor ${floor}`)
  }
  const sheet = components.find((component) => component.name === 'OneNativeSheet')
  if (!sheet) fail('sheetComponents names no OneNativeSheet')
  for (const { prop, type } of sheetConfigureArgs) {
    if (!(prop in sheet!.props)) fail(`configure prop ${prop} is not in the spec`)
    if (sheet!.props[prop] !== type)
      fail(`configure prop ${prop} carries ${sheet!.props[prop]}, not the ${type} the model reads`)
  }
  if (sheet!.props.detents !== 'ReadonlyArray<NativeSheetDetent>')
    fail(`detents crosses as ${sheet!.props.detents}, not a NativeSheetDetent array`)
  const events: Record<string, Record<string, string>> = {
    onNativeSheetIsPresentedChange: { isPresented: 'boolean', eventCount: 'Int32', revision: 'Int32' },
    onNativeSheetDismiss: { revision: 'Int32' },
    onNativeSheetDetentChange: { type: 'string', value: 'Double', eventCount: 'Int32', revision: 'Int32' },
  }
  for (const [event, fields] of Object.entries(events)) {
    const declared = sheet!.events[event] ?? fail(`event ${event} is not in the spec`)
    if (JSON.stringify(declared) !== JSON.stringify(fields))
      fail(`${event} must carry ${Object.keys(fields).join(', ')}`)
  }
  if (!components.some((component) => component.name === 'OneNativeSheetContent'))
    fail('sheetComponents names no OneNativeSheetContent')
}

export function emitSheet(
  header: string,
  outputs: Map<string, string>,
  inventory: readonly Declaration[],
  floor: number,
  ceiling: number
) {
  validateSheetHost(inventory, floor, ceiling)
  const sheet = sheetComponents.find((component) => component.name === 'OneNativeSheet')!
  const detentCases = (make: (type: string, member: string) => string) =>
    sheetDetentMembers
      .map(({ type, member, kind }) =>
        kind === 'value' ? `case ${JSON.stringify(type)}: ${make(type, `.${member}`)}` : `case ${JSON.stringify(type)}: ${make(type, `.${member}(value)`)}`
      )
      .join('\n')
  const configureParams = sheetConfigureArgs
    .map(({ label, prop }) => {
      const name = label === '_' ? `_ ${prop}` : label === prop ? prop : `${label} ${prop}`
      return `${name}: ${swiftTypeOf(prop, sheet.props[prop as keyof typeof sheet.props] as unknown as string)}`
    })
    .join(',\n')
  const configureCall = sheetConfigureArgs
    .map(({ label, prop }, index) => {
      const value = objcArgumentOf(prop, sheet.props[prop as keyof typeof sheet.props] as unknown as string)
      return index === 0 ? `configure:${value}` : `${label}:${value}`
    })
    .join('\n')
  for (const component of sheetComponents) {
    const usesColor = Object.values(component.props).includes('ColorValue')
    outputs.set(
      `src/platform/specs/${component.name}NativeComponent.ts`,
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
    'src/platform/generated/sheetTypes.ts',
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
import UIKit
struct OneNativeSheetRoot: View {
  @ObservedObject var model: OneNativeSheetModel
  private var presented: Binding<Bool> {
    Binding(get: { model.controlled.value && model.content != nil }, set: { model.change($0) })
  }
  @ViewBuilder private var content: some View {
    if let content = model.content {
      OneNativeSlot(content: content, mode: .presented, onLayout: { frame in
        if model.active && model.controlled.value { model.onLayout?(frame) }
      }, onWindowChange: { identity, attached in
        model.presentedWindowChanged(identity, attached: attached)
      }, measuredHeight: model.presentationSizing == "fitted" ? model.measuredHeight : 0)
      .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
  }
  var body: some View {
    if model.presentation == "fullScreenCover" {
      Color.clear
        .fullScreenCover(isPresented: presented) {
          content
        }
    } else {
      Color.clear
        .sheet(isPresented: presented) {
          content
            .oneNativeSheetPresentation(model)
        }
    }
  }
}

extension View {
  @ViewBuilder func oneNativeSheetPresentation(
    _ model: OneNativeSheetModel
  ) -> some View {
    self
      .presentationDetents(model.detents, selection: Binding(
        get: { model.selectedPresentationDetent },
        set: { model.changeDetent($0) }
      ))
      .oneNativeSheetPresentationModifiers(model)
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
      .preferredColorScheme(model.colorScheme.isEmpty ? nil : OneNativeGenerated.colorScheme(model.colorScheme))
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
    if #available(iOS 18.0, *) {
      switch value {
      case "fitted": self.presentationSizing(.fitted)
      case "form": self.presentationSizing(.form)
      case "page": self.presentationSizing(.page)
      default: self.presentationSizing(.automatic)
      }
    } else {
      self
    }
  }
}
`
  )
  outputs.set(
    'ios/Generated/OneNativeSheetView.swift',
    header +
      `import SwiftUI
import UIKit

final class OneNativeSheetModel: ObservableObject {
  @Published var controlled = OneNativeControlled(false)
  @Published var content: UIView?
  @Published var detents: Set<PresentationDetent> = [.large]
  @Published var selectedDetent = OneNativeControlled("")
  @Published var presentationDragIndicator = "automatic"
  @Published var interactiveDismissDisabled = false
  @Published var presentationBackground: UIColor?
  @Published var presentationBackgroundInteraction = "automatic"
  @Published var presentationBackgroundInteractionDetent: PresentationDetent = .large
  @Published var presentationContentInteraction = "automatic"
  @Published var presentationSizing = "automatic"
  // the laid-out React Native content height, reported back from the bridge.
  // fitted sizing reads it as the ideal height; detents ignore it.
  @Published var measuredHeight: CGFloat = 0
  var detentValues: [(key: String, type: String, value: Double, detent: PresentationDetent)] = [
    ("large:0", "large", 0, .large)
  ]
  var controlsSelectedDetent = false
  @Published var presentation = "sheet"
  @Published var colorScheme = ""
  var active = false
  var onChange: ((Bool, Int, Int) -> Void)?
  var onDetentChange: ((String, Double, Int, Int) -> Void)?
  var onDismiss: ((Int) -> Void)?
  var onLayout: ((CGRect) -> Void)?
  // dismissal reports only after the presented content leaves its window, so
  // an interrupted close or a reopen never completes an earlier presentation.
  // the generation distinguishes presents; the revision matches React's update.
  private var presentationGeneration = 0
  private var presentedSlot: (identity: ObjectIdentifier, generation: Int, revision: Int)?
  func change(_ value: Bool) {
    guard active, controlled.value != value else { return }
    if value { notePresented() }
    controlled.change(value)
    onChange?(value, controlled.eventCount, controlled.revision)
  }

  func notePresented() {
    presentationGeneration += 1
    // a reopen while the same slot is still mounted adopts it, so the detach
    // to come completes this presentation rather than the interrupted one.
    if let slot = presentedSlot {
      presentedSlot = (slot.identity, presentationGeneration, controlled.revision)
    }
  }

  func noteRevision() {
    guard let slot = presentedSlot else { return }
    presentedSlot = (slot.identity, slot.generation, controlled.revision)
  }

  func presentedWindowChanged(_ identity: ObjectIdentifier, attached: Bool) {
    if attached {
      presentedSlot = (identity, presentationGeneration, controlled.revision)
      return
    }
    guard let slot = presentedSlot, slot.identity == identity else { return }
    presentedSlot = nil
    // completion belongs to the original mounted presentation, never a later reopen.
    guard active, !controlled.value, slot.generation == presentationGeneration,
      slot.revision == controlled.revision else { return }
    onDismiss?(slot.revision)
  }

  var selectedPresentationDetent: PresentationDetent {
    detentValues.first(where: { $0.key == selectedDetent.value })?.detent
      ?? detentValues.first?.detent
      ?? .large
  }

  func changeDetent(_ detent: PresentationDetent) {
    guard active,
      let next = detentValues.first(where: { $0.detent == detent }),
      selectedDetent.value != next.key
    else { return }
    selectedDetent.change(next.key)
    if controlsSelectedDetent {
      onDetentChange?(
        next.type, next.value, selectedDetent.eventCount, selectedDetent.revision)
    }
  }

  func setMeasuredHeight(_ height: CGFloat) {
    guard height.isFinite, height > 0, abs(measuredHeight - height) >= 0.5 else { return }
    measuredHeight = height
  }
}

@objcMembers public final class OneNativeSheetView: UIView {
  public var onChange: ((Bool, Int, Int) -> Void)?
  public var onDetentChange: ((String, Double, Int, Int) -> Void)?
  public var onDismiss: ((Int) -> Void)?
  private var model = OneNativeSheetModel()
  private var controller: OneNativeHostingController<OneNativeSheetRoot>?
  public override init(frame: CGRect) { super.init(frame: frame) }
  required init?(coder: NSCoder) { fatalError("init(coder:) is unavailable") }
  public func mountContent(_ view: UIView, onLayout: @escaping (CGRect) -> Void) {
    model.onLayout = onLayout
    model.content = view
  }
  public func unmountContent(_ view: UIView) {
    model.onLayout = nil
    if model.content === view { model.content = nil }
    view.removeFromSuperview()
  }
  public func setMeasuredHeight(_ height: CGFloat) { model.setMeasuredHeight(height) }
  public func setDetents(_ detents: [[String: Any]]) {
    let values = detents.map { item -> (key: String, type: String, value: Double, detent: PresentationDetent) in
      let type = item["type"] as! String
      let value = item["value"] as! Double
      let detent: PresentationDetent
      switch type {
      ${detentCases((_, member) => `detent = ${member}`).replaceAll('\n', '\n      ')}
      default: preconditionFailure("invalid presentation detent")
      }
      return ("\\(type):\\(value)", type, value, detent)
    }
    let next = Set(values.map(\\.detent))
    if model.detents != next {
      model.detentValues = values
      model.detents = next
      if !values.contains(where: { $0.key == model.selectedDetent.value }),
        let first = values.first
      {
        model.selectedDetent = OneNativeControlled(first.key)
      }
    } else {
      model.detentValues = values
    }
  }
  public func configure(
    ${configureParams.replaceAll('\n', '\n    ')}
  ) {
    if let next = model.controlled.applying(isPresented, acknowledged: acknowledgedEvent, revision: revision) {
      if next.value && !model.controlled.value { model.notePresented() }
      model.controlled = next
      model.noteRevision()
    }
    let controlsSelectedDetent = !selectedDetentType.isEmpty
    if controlsSelectedDetent {
      let key = "\\(selectedDetentType):\\(selectedDetentValue)"
      if !model.controlsSelectedDetent {
        model.selectedDetent = OneNativeControlled(key)
      } else if let next = model.selectedDetent.applying(
        key, acknowledged: acknowledgedDetentEvent, revision: detentRevision)
      {
        model.selectedDetent = next
      }
    }
    model.controlsSelectedDetent = controlsSelectedDetent
    if model.interactiveDismissDisabled != interactiveDismissDisabled { model.interactiveDismissDisabled = interactiveDismissDisabled }
    if model.presentationDragIndicator != presentationDragIndicator { model.presentationDragIndicator = presentationDragIndicator }
    if model.presentation != presentation { model.presentation = presentation }
    if model.colorScheme != colorScheme { model.colorScheme = colorScheme }
    if model.presentationBackground != presentationBackground { model.presentationBackground = presentationBackground }
    if model.presentationBackgroundInteraction != presentationBackgroundInteraction {
      model.presentationBackgroundInteraction = presentationBackgroundInteraction
    }
    let interactionDetent = Self.detent(
      type: presentationBackgroundInteractionDetentType,
      value: presentationBackgroundInteractionDetentValue)
    if model.presentationBackgroundInteractionDetent != interactionDetent {
      model.presentationBackgroundInteractionDetent = interactionDetent
    }
    if model.presentationContentInteraction != presentationContentInteraction {
      model.presentationContentInteraction = presentationContentInteraction
    }
    if model.presentationSizing != presentationSizing { model.presentationSizing = presentationSizing }
  }

  private static func detent(type: String, value: Double) -> PresentationDetent {
    switch type {
    ${detentCases((_, member) => `return ${member}`).replaceAll('\n', '\n    ')}
    default: return .large
    }
  }
  public override func didMoveToWindow() { super.didMoveToWindow(); updateHost() }
  public override func layoutSubviews() { super.layoutSubviews(); updateHost() }
  private func updateHost() {
    model.active = false
    guard window != nil else { controller?.detach(); return }
    if controller == nil {
      model.onChange = { [weak self] value, count, revision in self?.onChange?(value, count, revision) }
      model.onDetentChange = { [weak self] type, value, count, revision in
        self?.onDetentChange?(type, value, count, revision)
      }
      model.onDismiss = { [weak self] revision in self?.onDismiss?(revision) }
      controller = OneNativeHostingController(rootView: OneNativeSheetRoot(model: model), screenInsets: true)
    }
    controller?.attach(to: self)
    model.active = controller?.isAttached == true
  }
  public func reset() {
    model.active = false; model.onChange = nil; model.onDetentChange = nil; model.onDismiss = nil; model.onLayout = nil
    controller?.presentedViewController?.dismiss(animated: false)
    controller?.detach(); controller = nil; model = OneNativeSheetModel()
  }
}
`
  )
  outputs.set(
    'ios/Generated/OneNativeSheetComponentView.h',
    `${header}#ifdef __cplusplus
#import <React/RCTViewComponentView.h>
@interface OneNativeSheetComponentView : RCTViewComponentView
@end
@interface OneNativeSheetContentComponentView : RCTViewComponentView
- (void)updateNativeFrame:(CGRect)frame;
- (void)setMeasuredHeightCallback:(void (^)(CGFloat height))callback;
@end
#endif
`
  )
  const [configureFirst, ...configureRest] = configureCall.split('\n')
  outputs.set(
    'ios/Generated/OneNativeSheetComponentView.mm',
    `${header}#import "OneNativeSheetComponentView.h"
#import <React/RCTView.h>
#import "One-Swift.h"
#import "OneNativeSheetContentShadowNode.h"
#import <React/RCTSurfaceTouchHandler.h>
#import <React/RCTConversions.h>
#import <react/renderer/components/OneNativeSpec/ComponentDescriptors.h>
#import <react/renderer/components/OneNativeSpec/EventEmitters.h>
#include <cmath>
using namespace facebook::react;

@implementation OneNativeSheetComponentView { OneNativeSheetView *_sheet; BOOL _detentsDirty; }
+ (ComponentDescriptorProvider)componentDescriptorProvider { return concreteComponentDescriptorProvider<OneNativeSheetComponentDescriptor>(); }
- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const OneNativeSheetProps>();
    _detentsDirty = YES;
    _sheet = [OneNativeSheetView new]; self.contentView = _sheet;
    __weak OneNativeSheetComponentView *weakSelf = self;
    _sheet.onChange = ^(BOOL value, NSInteger eventCount, NSInteger revision) {
      OneNativeSheetComponentView *strongSelf = weakSelf;
      if (!strongSelf || !strongSelf->_eventEmitter) return;
      auto emitter = std::static_pointer_cast<const OneNativeSheetEventEmitter>(strongSelf->_eventEmitter);
      emitter->onNativeSheetIsPresentedChange({.isPresented = (bool)value, .eventCount = (int)eventCount, .revision = (int)revision});
    };
    _sheet.onDismiss = ^(NSInteger revision) {
      OneNativeSheetComponentView *strongSelf = weakSelf;
      if (!strongSelf || !strongSelf->_eventEmitter) return;
      auto emitter = std::static_pointer_cast<const OneNativeSheetEventEmitter>(strongSelf->_eventEmitter);
      emitter->onNativeSheetDismiss({.revision = (int)revision});
    };
    _sheet.onDetentChange = ^(NSString *type, double value, NSInteger eventCount, NSInteger revision) {
      OneNativeSheetComponentView *strongSelf = weakSelf;
      if (!strongSelf || !strongSelf->_eventEmitter) return;
      auto emitter = std::static_pointer_cast<const OneNativeSheetEventEmitter>(strongSelf->_eventEmitter);
      emitter->onNativeSheetDetentChange({
        .type = std::string(type.UTF8String), .value = value,
        .eventCount = (int)eventCount, .revision = (int)revision
      });
    };
  }
  return self;
}
- (void)mountChildComponentView:(UIView<RCTComponentViewProtocol> *)child index:(NSInteger)index {
  OneNativeSheetContentComponentView *content = (OneNativeSheetContentComponentView *)child;
  __weak OneNativeSheetContentComponentView *weakContent = content;
  __weak OneNativeSheetView *weakSheet = _sheet;
  [content setMeasuredHeightCallback:^(CGFloat height) { [weakSheet setMeasuredHeight:height]; }];
  [_sheet mountContent:child onLayout:^(CGRect frame) { [weakContent updateNativeFrame:frame]; }];
}
- (void)unmountChildComponentView:(UIView<RCTComponentViewProtocol> *)child index:(NSInteger)index {
  [(OneNativeSheetContentComponentView *)child setMeasuredHeightCallback:nil];
  [_sheet unmountContent:child];
}
- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
  const auto &next = *std::static_pointer_cast<const OneNativeSheetProps>(props);
  const auto &previous = *std::static_pointer_cast<const OneNativeSheetProps>(_props);
  bool changed = _detentsDirty || next.detents.size() != previous.detents.size();
  if (!changed) for (size_t i = 0; i < next.detents.size(); i++) {
    if (next.detents[i].type != previous.detents[i].type || next.detents[i].value != previous.detents[i].value) { changed = true; break; }
  }
  if (changed) {
    NSMutableArray *detents = [NSMutableArray new];
    for (const auto &detent : next.detents) [detents addObject:@{@"type": RCTNSStringFromString(detent.type), @"value": @(detent.value)}];
    [_sheet setDetents:detents];
    _detentsDirty = NO;
  }
  [_sheet ${configureFirst}
${configureRest.map((line) => `    ${line}`).join('\n')}];
  [super updateProps:props oldProps:oldProps];
}
- (void)prepareForRecycle { [super prepareForRecycle]; [_sheet reset]; _detentsDirty = YES; }
@end

@implementation OneNativeSheetContentComponentView {
  OneNativeSheetContentShadowNode::ConcreteState::Shared _slotState;
  RCTSurfaceTouchHandler *_touchHandler;
  void (^_measuredHeightCallback)(CGFloat);
}
+ (ComponentDescriptorProvider)componentDescriptorProvider { return concreteComponentDescriptorProvider<OneNativeSheetContentComponentDescriptor>(); }
- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const OneNativeSheetContentProps>();
    // presentation leaves the RN surface, as it does for React Native's Modal.
    _touchHandler = [RCTSurfaceTouchHandler new]; [_touchHandler attachToView:self];
  }
  return self;
}
- (void)updateState:(State::Shared const &)state oldState:(State::Shared const &)oldState {
  _slotState = std::static_pointer_cast<const OneNativeSheetContentShadowNode::ConcreteState>(state);
  [self reportMeasuredHeight];
}
- (void)setMeasuredHeightCallback:(void (^)(CGFloat))callback {
  _measuredHeightCallback = [callback copy];
  [self reportMeasuredHeight];
}
// the shadow node measures the children's layout, since flattening can remove the
// authored root from the mounted views.
- (void)reportMeasuredHeight {
  if (!_measuredHeightCallback || !_slotState) return;
  const auto height = _slotState->getData().content.height;
  if (std::isfinite(height) && height > 0) _measuredHeightCallback(height);
}
- (void)updateNativeFrame:(CGRect)frame {
  if (!_slotState || !std::isfinite(frame.size.width) || !std::isfinite(frame.size.height)) return;
  const auto &old = _slotState->getData();
  const facebook::react::Size size{(Float)frame.size.width, (Float)frame.size.height};
  if (old.measured && old.size == size) return;
  OneNativeSlotState state = old; state.size = size; state.measured = true;
  _slotState->updateState(std::move(state));
}
- (void)updateLayoutMetrics:(LayoutMetrics const &)layoutMetrics oldLayoutMetrics:(LayoutMetrics const &)oldLayoutMetrics {
  [super updateLayoutMetrics:layoutMetrics oldLayoutMetrics:oldLayoutMetrics];
  self.frame = (CGRect){CGPointZero, self.bounds.size};
}
- (void)prepareForRecycle {
  [super prepareForRecycle];
  _touchHandler.enabled = NO; _touchHandler.enabled = YES; _slotState.reset(); _measuredHeightCallback = nil;
}
@end
`
  )
  outputs.set(
    'cpp/OneNativeSheetContentShadowNode.h',
    `${header}#pragma once
#ifdef __cplusplus
#include <react/renderer/components/OneNativeSpec/EventEmitters.h>
#include <react/renderer/components/OneNativeSpec/Props.h>
#include "OneNativeSlotShadowNode.h"
namespace facebook::react {
extern const char OneNativeSheetContentComponentName[];
using OneNativeSheetContentShadowNode = OneNativePresentedSlotShadowNode<OneNativeSheetContentComponentName, OneNativeSheetContentProps, OneNativeSheetContentEventEmitter>;
using OneNativeSheetContentComponentDescriptor = OneNativeSlotComponentDescriptor<OneNativeSheetContentShadowNode>;
}
#endif
`
  )
  outputs.set(
    'cpp/OneNativeSheetContentShadowNode.cpp',
    `${header}#include "OneNativeSheetContentShadowNode.h"

namespace facebook::react {
extern const char OneNativeSheetContentComponentName[] = "OneNativeSheetContent";
}
`
  )
}
