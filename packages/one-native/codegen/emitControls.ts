import { controls } from './controlCatalog'
import { styleFields } from './catalog'
import type { Control, ControlField, ScalarType } from './controlTypes'

const swiftScalar = (type: ScalarType) =>
  ({ string: 'String', boolean: 'Bool', Double: 'Double' })[type]
const tsScalar = (type: ScalarType) =>
  ({ string: 'string', boolean: 'boolean', Double: 'number' })[type]
const payloadOf = (field: ControlField) => {
  if (!field.payload) throw new Error('an objects field needs a payload shape')
  return field.payload
}
const swiftType = (field: ControlField) =>
  field.type === 'objects'
    ? `[OneNative${payloadOf(field).name}]`
    : swiftScalar(field.type)
const tsType = (field: ControlField) =>
  field.type === 'objects' ? `readonly ${payloadOf(field).name}[]` : tsScalar(field.type)
const nativeType = (field: ControlField) =>
  field.type === 'objects' ? `ReadonlyArray<${payloadOf(field).name}>` : field.type
const literal = (value: string | boolean | number) => JSON.stringify(value)
const lower = (name: string) => name[0].toLowerCase() + name.slice(1)
const upper = (name: string) => name[0].toUpperCase() + name.slice(1)
// an enum field defaulting to the empty string means unset; the Swift helper passes self through.
const optionalEnum = (field: ControlField) => Boolean(field.enum) && field.default === ''

export function emitControls(header: string, outputs: Map<string, string>) {
  if (!controls.length) return
  const payloads: Record<string, NonNullable<ControlField['payload']>> = {}
  for (const control of controls)
    for (const field of Object.values(control.fields))
      if (field.type === 'objects') payloads[payloadOf(field).name] = payloadOf(field)
  // the public type may name a SwiftUI enum where the native prop carries a plain string.
  // the spec is read by React Native's codegen, which spells scalars its own way, so a
  // payload field is `number` in the public types and `Double` in the spec.
  const payloadType = (name: string, target: 'public' | 'spec') =>
    `Readonly<{ ${Object.entries(payloads[name].element)
      .map(
        ([key, type]) =>
          `${key}${payloads[name].optional?.includes(key) ? '?' : ''}: ${target === 'spec' ? type : payloads[name].publicTypes?.[key] || tsScalar(type)}`
      )
      .join('; ')} }>`
  let types =
    header +
    `import type { ColorValue, ViewProps } from 'react-native'
import type * as Styles from './swiftui'
import type { KeyboardType, TextContentType } from '../textTypes'

export interface OneNativeStyle {
${styleFields
  .map(
    (field) =>
      `  ${field.name}?: ${field.kind === 'number' ? 'number' : field.kind === 'color' ? 'ColorValue' : 'string'}`
  )
  .join('\n')}
}

// the React Native props a One Native control honors. a composed control renders inside its
// parent's SwiftUI tree and its own UIView is never displayed, so the rest of ViewProps would
// be accepted and then silently do nothing.
//
// accessibility travels into the SwiftUI content, so it means the same thing in both
// positions. \`style\` and \`onLayout\` describe the outer Yoga box, which only a standalone
// control has: composed, a control is measured by its parent instead.
export type OneNativeViewProps = Pick<
  ViewProps,
  'accessibilityLabel' | 'accessibilityHint' | 'accessibilityValue' | 'testID' | 'style' | 'onLayout'
> & {
  swiftStyle?: OneNativeStyle
}
` +
    Object.keys(payloads)
      .map((name) => `export type ${name} = ${payloadType(name, 'public')}\n`)
      .join('')
  let adapters =
    header +
    "import { Platform } from 'react-native'\nimport { useControlled } from '../controlled'\nimport { assertSwiftUIValue } from './swiftui'\nimport type * as Types from './controlTypes'\n"
  const schema = []
  for (const control of controls) {
    const { name, fields, value, actions = [] } = control
    const nativeName = 'OneNative' + name
    const fieldEntries = Object.entries(fields)
    // derived fields are native-only; object arrays travel through their own setter.
    const publicFields = fieldEntries.filter(([, field]) => !field.derived)
    const plainFields = fieldEntries.filter(([, field]) => field.type !== 'objects')
    const objectFields = fieldEntries.filter(([, field]) => field.type === 'objects')
    const enumFields = publicFields.filter(([, field]) => field.enum)
    const disabled = Object.hasOwn(fields, 'disabled')
    // a measured control reports the height SwiftUI measured, so it supplies its own shadow
    // node and the spec must not generate one. fill and presentation controls are sized by
    // React Native, so they keep the shadow node codegen writes.
    const measured = !control.layout
    const presentation = control.layout === 'presentation'
    // weakSelf only exists for the blocks below it, so a control with none would declare it
    // and never read it.
    const callbacks = measured || !!value || actions.length > 0 || !!control.focus
    const publicValueType = value && (value.publicType ?? tsScalar(value.type))
    const callbackType = (action: { payload?: Record<string, ScalarType> }) =>
      `(${Object.entries(action.payload ?? {})
        .map(([key, type]) => `${key}: ${tsScalar(type)}`)
        .join(', ')}) => void`
    types += `export interface ${name}Props extends OneNativeViewProps {
${
  value
    ? `  ${value.prop}: ${publicValueType}
  ${value.event}: (value: ${publicValueType}) => void
  revision?: number
`
    : ''
}${
      control.focus
        ? `  focused?: boolean
  onFocusChange?: (focused: boolean) => void
  focusRevision?: number
`
        : ''
    }${actions.map((action) => `  ${action.prop}?: ${callbackType(action)}\n`).join('')}${publicFields.map(([key, field]) => `  ${key}${field.type === 'objects' ? '' : '?'}: ${field.publicType ? `${field.publicType}${field.default === '' ? " | ''" : ''}` : field.enum ? `Styles.${field.enum}${optionalEnum(field) ? " | ''" : ''}` : tsType(field)}`).join('\n')}
}\n`
    const props = {
      ...(value
        ? { value: value.type, acknowledgedEvent: 'Int32', revision: 'Int32' }
        : {}),
      ...(control.focus
        ? {
            focused: 'boolean',
            acknowledgedFocusEvent: 'Int32',
            focusRevision: 'Int32',
          }
        : {}),
      ...Object.fromEntries(fieldEntries.map(([key, field]) => [key, nativeType(field)])),
    }
    const events: Record<string, Record<string, string>> = {
      ...(value
        ? {
            [`onNative${name}ValueChange`]: {
              value: value.type,
              eventCount: 'Int32',
              revision: 'Int32',
            },
          }
        : {}),
      ...(control.focus
        ? {
            [`onNative${name}FocusChange`]: {
              value: 'boolean',
              eventCount: 'Int32',
              revision: 'Int32',
            },
          }
        : {}),
      ...Object.fromEntries(
        actions.map((action) => [
          `onNative${name}${action.event}`,
          { ...action.payload, eventCount: 'Int32' },
        ])
      ),
    }
    schema.push({
      name: nativeName,
      publicName: name,
      props,
      events,
      enumProps: Object.fromEntries(
        fieldEntries.flatMap(([key, field]) => (field.enum ? [[key, field.enum]] : []))
      ),
      controlled: value
        ? { value: 'value', event: `onNative${name}ValueChange` }
        : undefined,
      focus: control.focus
        ? { value: 'focused', event: `onNative${name}FocusChange` }
        : undefined,
      actions: actions.map((action) => ({
        publicProp: action.prop,
        event: `onNative${name}${action.event}`,
      })),
      layout: { kind: control.layout ?? 'measured' },
      slots: [],
      interfaceOnly: measured,
    })
    const usedPayloads = [
      ...new Set(objectFields.map(([, field]) => payloadOf(field).name)),
    ]
    const codegenTypes = ['DirectEventHandler', 'Int32', 'Double', 'WithDefault'].filter(
      (type) => {
        if (type === 'DirectEventHandler') return Object.keys(events).length > 0
        if (type === 'Double' || type === 'WithDefault') return true
        return [
          ...Object.values(props),
          ...Object.values(events).flatMap((fields) => Object.values(fields)),
          ...usedPayloads.flatMap((payload) => Object.values(payloads[payload].element)),
        ].includes(type)
      }
    )
    outputs.set(
      `src/specs/${nativeName}NativeComponent.ts`,
      header +
        `import type { ColorValue, ViewProps } from 'react-native'
${codegenTypes.length ? `import type { ${codegenTypes.join(', ')} } from 'react-native/Libraries/Types/CodegenTypes'` : ''}
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent'
${usedPayloads.map((payload) => `type ${payload} = ${payloadType(payload, 'spec')}`).join('\n')}
type OneNativeStyleNative = Readonly<{
${styleFields
  .map(
    (field) =>
      `  ${field.name}?: ${field.kind === 'number' ? 'WithDefault<Double, -1>' : field.kind === 'color' ? 'ColorValue' : 'string'}`
  )
  .join('\n')}
}>
interface NativeProps extends ViewProps {
${Object.entries(props)
  .map(([key, type]) => `  ${key}: ${type}`)
  .join('\n')}
  swiftStyle?: OneNativeStyleNative
${Object.entries(events)
  .map(
    ([key, fields]) =>
      `  ${key}?: DirectEventHandler<Readonly<{ ${Object.entries(fields)
        .map(([field, type]) => `${field}: ${type}`)
        .join('; ')} }>>`
  )
  .join('\n')}
}
export default codegenNativeComponent<NativeProps>('${nativeName}'${measured ? ', { interfaceOnly: true }' : ''})
`
    )
    const parameters = [
      ...(value ? [value.prop, value.event, 'revision = 0'] : []),
      ...(control.focus ? ['focused', 'onFocusChange', 'focusRevision = 0'] : []),
      ...actions.map((action) => action.prop),
      ...publicFields.map(([key, field]) =>
        field.type === 'objects'
          ? key
          : `${key} = ${field.jsDefault ?? literal(field.default)}`
      ),
      'swiftStyle',
      'style',
      '...props',
    ]
    // a measured control's height arrives from SwiftUI through Fabric state and a fill
    // control takes the box it was given, so both pass style straight through. only a
    // presentation collapses, because it has no box to occupy.
    const styleProp = presentation
      ? "style={[{ position: 'absolute', width: 0, height: 0 }, style]}"
      : 'style={style}'
    adapters += `import Native${name} from '../specs/${nativeName}NativeComponent'
export function ${name}({ ${parameters.join(', ')} }: Types.${name}Props) {
${control.validate}
${enumFields.map(([key, field]) => `  ${optionalEnum(field) ? `if (${key}) ` : ''}assertSwiftUIValue('${field.enum}', ${key}, Number.parseFloat(String(Platform.Version)))`).join('\n')}
${
  value
    ? `  const controlled = useControlled<{ value: ${tsScalar(value.type)}; eventCount: number; revision: number }>(event => ${value.event}(${value.eventValue ?? 'event.value'}), revision)\n`
    : ''
}${
      control.focus
        ? `  const controlledFocus = useControlled<{ value: boolean; eventCount: number; revision: number }>(event => onFocusChange?.(event.value), focusRevision)\n`
        : ''
    }  return <Native${name} {...props} ${styleProp}
    swiftStyle={swiftStyle}
${value ? `    value={${value.nativeValue ?? value.prop}} acknowledgedEvent={controlled.acknowledgedEvent} revision={revision}\n` : ''}${
      control.focus
        ? `    focused={focused ?? false} acknowledgedFocusEvent={focused !== undefined ? controlledFocus.acknowledgedEvent : 0} focusRevision={focusRevision}\n`
        : ''
    }${fieldEntries.map(([key, field]) => `    ${key}={${field.nativeValue ?? key}}`).join('\n')}
${value ? `    onNative${name}ValueChange={({ nativeEvent }) => controlled.onNativeChange(nativeEvent)}\n` : ''}${
      control.focus
        ? `    onNative${name}FocusChange={({ nativeEvent }) => controlledFocus.onNativeChange(nativeEvent)}\n`
        : ''
    }${actions
      .map(
        (action) =>
          `    onNative${name}${action.event}={({ nativeEvent }) => ${action.prop}?.(${Object.keys(
            action.payload ?? {}
          )
            .map((key) => `nativeEvent.${key}`)
            .join(', ')})}\n`
      )
      .join('')}  />
}
`
    const swiftFields = fieldEntries
      .map(
        ([key, field]) =>
          `  @Published var ${key}: ${swiftType(field)} = ${field.type === 'objects' ? '[]' : literal(field.default)}`
      )
      .join('\n')
    const configure = [
      ...(value
        ? [
            { label: '_ value', type: swiftScalar(value.type) },
            { label: 'acknowledgedEvent', type: 'Int' },
            { label: 'revision', type: 'Int' },
          ]
        : []),
      ...(control.focus
        ? [
            { label: 'focused', type: 'Bool' },
            { label: 'acknowledgedFocusEvent', type: 'Int' },
            { label: 'focusRevision', type: 'Int' },
          ]
        : []),
      ...plainFields.map(([key, field]) => ({ label: key, type: swiftType(field) })),
    ]
    // objective-c names the selector from the first label, so it is always unlabeled.
    if (!value && configure.length) configure[0].label = `_ ${configure[0].label}`
    const guards = ['active', ...(disabled ? ['!disabled'] : [])]
    outputs.set(
      `ios/Generated/${nativeName}View.swift`,
      header +
        `import SwiftUI
import UIKit${(control.imports ?? []).map((framework) => `\nimport ${framework}`).join('')}

private final class ${name}Model: ObservableObject {
${value ? `  @Published var controlled = OneNativeControlled<${swiftScalar(value.type)}>(${literal(value.initial)})\n` : ''}${
          control.focus
            ? '  @Published var controlledFocus = OneNativeControlled<Bool>(false)\n'
            : ''
        }${swiftFields}
  @Published var accessibility = OneNativeAccessibility()
  @Published var swiftStyle = OneNativeStyle()
  var active = false
${
  value
    ? `  var onChange: ((${swiftScalar(value.type)}, Int, Int) -> Void)?
  func change(_ value: ${swiftScalar(value.type)}) {
    guard ${[...guards, 'controlled.value != value'].join(', ')} else { return }
    controlled.change(value)
    onChange?(value, controlled.eventCount, controlled.revision)
  }
`
    : ''
}${
          control.focus
            ? `  var onFocusChange: ((Bool, Int, Int) -> Void)?
  func changeFocus(_ value: Bool) {
    guard ${[...guards, 'controlledFocus.value != value'].join(', ')} else { return }
    controlledFocus.change(value)
    onFocusChange?(value, controlledFocus.eventCount, controlledFocus.revision)
  }
`
            : ''
        }${actions
          .map((action) => {
            const entries = Object.entries(action.payload ?? {})
            const types = [...entries.map(([, type]) => swiftScalar(type)), 'Int']
            return `  var on${action.event}: ((${types.join(', ')}) -> Void)?
  private var ${lower(action.event)}Count = 0
  func ${lower(action.event)}(${entries.map(([key, type]) => `_ ${key}: ${swiftScalar(type)}`).join(', ')}) {
    guard ${guards.join(', ')} else { return }
    ${lower(action.event)}Count += 1
    on${action.event}?(${[...entries.map(([key]) => key), `${lower(action.event)}Count`].join(', ')})
  }
`
          })
          .join('')}}
@objcMembers public final class ${nativeName}View: UIView, OneNativeComposable {
${value ? `  public var onChange: ((${swiftScalar(value.type)}, Int, Int) -> Void)?\n` : ''}${
          control.focus ? '  public var onFocusChange: ((Bool, Int, Int) -> Void)?\n' : ''
        }${actions
          .map(
            (action) =>
              `  public var on${action.event}: ((${[...Object.values(action.payload ?? {}).map(swiftScalar), 'Int'].join(', ')}) -> Void)?\n`
          )
          .join('')}  private var model = ${name}Model()
${measured ? '  public var onHeight: ((CGFloat) -> Void)?\n' : ''}  private var controller: OneNativeHostingController<${measured ? 'OneNativeMeasuredStandalone' : 'OneNativeStandalone'}<${name}Content>>?
  public override init(frame: CGRect) { super.init(frame: frame) }
  required init?(coder: NSCoder) { fatalError("init(coder:) is unavailable") }
  public func configureAccessibility(_ label: String, hint: String, value: String, identifier: String) {
    let next = OneNativeAccessibility(label: label, hint: hint, value: value, identifier: identifier)
    if model.accessibility != next { model.accessibility = next }
  }
  public func configureStyle(_ style: [String: Any]) {
    let next = OneNativeStyle(dictionary: style)
    if model.swiftStyle != next { model.swiftStyle = next }
  }
  public func configure(${configure.map((parameter) => `${parameter.label}: ${parameter.type}`).join(', ')}) {
${value ? '    if let next = model.controlled.applying(value, acknowledged: acknowledgedEvent, revision: revision) { model.controlled = next }\n' : ''}${
          control.focus
            ? '    if let next = model.controlledFocus.applying(focused, acknowledged: acknowledgedFocusEvent, revision: focusRevision) { model.controlledFocus = next }\n'
            : ''
        }${plainFields
          .map(([key]) => `    if model.${key} != ${key} { model.${key} = ${key} }`)
          .join('\n')}
  }
${objectFields
  .map(([key, field]) => {
    const payload = payloadOf(field)
    return `  public func set${upper(key)}(_ items: [[String: Any]]) { model.${key} = items.map { OneNative${payload.name}(${Object.entries(
      payload.element
    )
      .map(([name, type]) => `${name}: $0["${name}"] as! ${swiftScalar(type)}`)
      .join(', ')}) } }`
  })
  .join('\n')}

  private weak var compositionParent: OneNativeCompositionParent?
  public func compositionContent() -> AnyView { AnyView(${name}Content(model: model)) }
  // composed, there is no window to wait for, so publication is what activates it.
  public func composeInto(_ parent: OneNativeCompositionParent) {
    controller?.detach(); controller = nil
    compositionParent = parent
    bindCallbacks()
    model.active = true
  }
  public func decompose() { compositionParent = nil; model.active = false }
  public override func didMoveToWindow() { super.didMoveToWindow(); updateHost() }
  public override func layoutSubviews() { super.layoutSubviews(); updateHost() }
  private func bindCallbacks() {
${value ? '    model.onChange = { [weak self] value, count, revision in self?.onChange?(value, count, revision) }\n' : ''}${
          control.focus
            ? '    model.onFocusChange = { [weak self] value, count, revision in self?.onFocusChange?(value, count, revision) }\n'
            : ''
        }${actions
          .map((action) => {
            const names = [
              ...Object.keys(action.payload ?? {}),
              lower(action.event) + 'Count',
            ]
            return `    model.on${action.event} = { [weak self] ${names.join(', ')} in self?.on${action.event}?(${names.join(', ')}) }\n`
          })
          .join('')}  }
  private func updateHost() {
    guard compositionParent == nil else { return }
    model.active = false
    guard window != nil else { controller?.detach(); return }
    if controller == nil {
      bindCallbacks()
      controller = OneNativeHostingController(rootView: ${measured ? `OneNativeMeasuredStandalone(content: ${name}Content(model: model), onHeight: { [weak self] height in self?.onHeight?(height) })` : `OneNativeStandalone(content: ${name}Content(model: model))`})
    }
    controller?.attach(to: self)
    model.active = controller?.parent != nil
  }
  public func reset() {
    compositionParent = nil
    model.active = false${value ? '; model.onChange = nil' : ''}${control.focus ? '; model.onFocusChange = nil' : ''}${actions.map((action) => `; model.on${action.event} = nil`).join('')}
${presentation ? '    controller?.presentedViewController?.dismiss(animated: false)\n' : ''}    controller?.detach(); controller = nil; model = ${name}Model()
  }
}
private struct ${name}Content: View {
  @ObservedObject var model: ${name}Model
${control.focus ? '  @FocusState private var focused: Bool\n' : ''}  var body: some View {
    ${control.swift}
${
  control.focus
    ? `      .focused($focused)
      .onChange(of: focused) { _, isFocused in
        model.changeFocus(isFocused)
      }
      .onChange(of: model.controlledFocus.value) { _, isFocused in
        if focused != isFocused { focused = isFocused }
      }
      .onAppear {
        if model.controlledFocus.value { focused = true }
      }
`
    : ''
}${disabled ? '      .disabled(model.disabled)\n' : ''}      .oneNativeAccessibility(model.accessibility)
      .oneNativeStyle(model.swiftStyle)
  }
}
${control.extraSwift ?? ''}
`
    )
    if (measured) {
      outputs.set(
        `cpp/${nativeName}ShadowNode.h`,
        header +
          `#pragma once
#ifdef __cplusplus
#include <react/renderer/components/OneNativeSpec/EventEmitters.h>
#include <react/renderer/components/OneNativeSpec/Props.h>
#include "OneNativeMeasuredShadowNode.h"
namespace facebook::react {
extern const char ${nativeName}ComponentName[];
using ${nativeName}ShadowNode = OneNativeMeasuredShadowNode<${nativeName}ComponentName, ${nativeName}Props, ${nativeName}EventEmitter>;
using ${nativeName}ComponentDescriptor = OneNativeMeasuredComponentDescriptor<${nativeName}ShadowNode>;
}
#endif
`
      )
      outputs.set(
        `cpp/${nativeName}ShadowNode.cpp`,
        header +
          `#include "${nativeName}ShadowNode.h"

namespace facebook::react {
extern const char ${nativeName}ComponentName[] = "${nativeName}";
}
`
      )
    }
    outputs.set(
      `ios/Generated/${nativeName}ComponentView.h`,
      header +
        `#ifdef __cplusplus
#import <React/RCTViewComponentView.h>
@interface ${nativeName}ComponentView : RCTViewComponentView
@end
#endif
`
    )
    const objcScalar = (type: ScalarType) =>
      ({ string: 'NSString *', boolean: 'BOOL ', Double: 'double ' })[type]
    const cppScalar = (type: ScalarType, name: string) =>
      ({
        string: `std::string(${name}.UTF8String)`,
        boolean: `(bool)${name}`,
        Double: `(double)${name}`,
      })[type]
    const convert = (key: string, type: string) =>
      type === 'string' ? `RCTNSStringFromString(next.${key})` : `next.${key}`
    const call = [
      ...(value
        ? [
            { label: '', expression: convert('value', value.type) },
            { label: 'acknowledgedEvent', expression: 'next.acknowledgedEvent' },
            { label: 'revision', expression: 'next.revision' },
          ]
        : []),
      ...(control.focus
        ? [
            { label: 'focused', expression: 'next.focused' },
            {
              label: 'acknowledgedFocusEvent',
              expression: 'next.acknowledgedFocusEvent',
            },
            { label: 'focusRevision', expression: 'next.focusRevision' },
          ]
        : []),
      ...plainFields.map(([key, field]) => ({
        label: key,
        expression: convert(key, field.type),
      })),
    ]
    outputs.set(
      `ios/Generated/${nativeName}ComponentView.mm`,
      header +
        `#import "${nativeName}ComponentView.h"
#import "OneNative-Swift.h"
${measured ? `#import "${nativeName}ShadowNode.h"\n#import "OneNativeMeasuredHeight.h"` : '#import <react/renderer/components/OneNativeSpec/ComponentDescriptors.h>'}
#import <react/renderer/components/OneNativeSpec/EventEmitters.h>
#import <React/RCTConversions.h>
using namespace facebook::react;
@implementation ${nativeName}ComponentView { ${nativeName}View *_nativeView;${measured ? ' OneNativeMeasuredHeight *_measured;' : ''}${objectFields.map(([key]) => ` BOOL _${key}Dirty;`).join('')} }
+ (ComponentDescriptorProvider)componentDescriptorProvider { return concreteComponentDescriptorProvider<${nativeName}ComponentDescriptor>(); }${
          measured
            ? `
- (void)updateState:(State::Shared const &)state oldState:(State::Shared const &)oldState { [_measured adopt:state]; }`
            : ''
        }
- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const ${nativeName}Props>();
${objectFields.map(([key]) => `    _${key}Dirty = YES;\n`).join('')}${measured ? '    _measured = [OneNativeMeasuredHeight new];\n' : ''}    _nativeView = [${nativeName}View new]; self.contentView = _nativeView;
${callbacks ? `    __weak ${nativeName}ComponentView *weakSelf = self;\n` : ''}${
          measured
            ? `    _nativeView.onHeight = ^(CGFloat height) {
      ${nativeName}ComponentView *strongSelf = weakSelf;
      if (strongSelf) [strongSelf->_measured update:height];
    };\n`
            : ''
        }${
          value
            ? `    _nativeView.onChange = ^(${objcScalar(value.type)}value, NSInteger eventCount, NSInteger revision) {
      ${nativeName}ComponentView *strongSelf = weakSelf;
      if (!strongSelf || !strongSelf->_eventEmitter) return;
      auto emitter = std::static_pointer_cast<const ${nativeName}EventEmitter>(strongSelf->_eventEmitter);
      emitter->onNative${name}ValueChange({.value = ${cppScalar(value.type, 'value')}, .eventCount = (int)eventCount, .revision = (int)revision});
    };
`
            : ''
        }${
          control.focus
            ? `    _nativeView.onFocusChange = ^(BOOL value, NSInteger eventCount, NSInteger revision) {
      ${nativeName}ComponentView *strongSelf = weakSelf;
      if (!strongSelf || !strongSelf->_eventEmitter) return;
      auto emitter = std::static_pointer_cast<const ${nativeName}EventEmitter>(strongSelf->_eventEmitter);
      emitter->onNative${name}FocusChange({.value = (bool)value, .eventCount = (int)eventCount, .revision = (int)revision});
    };
`
            : ''
        }${actions
          .map((action) => {
            const entries = Object.entries(action.payload ?? {})
            return `    _nativeView.on${action.event} = ^(${[...entries.map(([key, type]) => `${objcScalar(type)}${key}`), 'NSInteger eventCount'].join(', ')}) {
      ${nativeName}ComponentView *strongSelf = weakSelf;
      if (!strongSelf || !strongSelf->_eventEmitter) return;
      auto emitter = std::static_pointer_cast<const ${nativeName}EventEmitter>(strongSelf->_eventEmitter);
      emitter->onNative${name}${action.event}({${[...entries.map(([key, type]) => `.${key} = ${cppScalar(type, key)}`), '.eventCount = (int)eventCount'].join(', ')}});
    };
`
          })
          .join('')}  }
  return self;
}
- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
  const auto &next = *std::static_pointer_cast<const ${nativeName}Props>(props);
${objectFields.length ? `  const auto &previous = *std::static_pointer_cast<const ${nativeName}Props>(_props);\n` : ''}${objectFields
          .map(([key, field]) => {
            const element = Object.keys(payloadOf(field).element)
            return `  bool ${key}Changed = _${key}Dirty || previous.${key}.size() != next.${key}.size();
  if (!${key}Changed) for (size_t i = 0; i < next.${key}.size(); i++) {
    if (${element.map((field) => `previous.${key}[i].${field} != next.${key}[i].${field}`).join(' || ')}) { ${key}Changed = true; break; }
  }
  if (${key}Changed) {
    NSMutableArray *${key} = [NSMutableArray new];
    for (const auto &item : next.${key}) [${key} addObject:@{${Object.entries(
      payloadOf(field).element
    )
      .map(
        ([field, type]) =>
          `@"${field}": ${type === 'string' ? `RCTNSStringFromString(item.${field})` : `@(item.${field})`}`
      )
      .join(', ')}}];
    [_nativeView set${upper(key)}:${key}];
    _${key}Dirty = NO;
  }`
          })
          .join('\n')}

  [_nativeView configureAccessibility:RCTNSStringFromString(next.accessibilityLabel)
    hint:RCTNSStringFromString(next.accessibilityHint)
    value:RCTNSStringFromString(next.accessibilityValue.text.value_or(""))
    identifier:RCTNSStringFromString(next.testId)];
  NSMutableDictionary *style = [NSMutableDictionary new];
${styleFields
  .map((field) => {
    switch (field.kind) {
      case 'number':
        return `  if (next.swiftStyle.${field.name} >= 0) style[@"${field.name}"] = @(next.swiftStyle.${field.name});`
      case 'string':
        return `  if (!next.swiftStyle.${field.name}.empty()) style[@"${field.name}"] = RCTNSStringFromString(next.swiftStyle.${field.name});`
      case 'color':
        return `  if (next.swiftStyle.${field.name}) { UIColor *c = RCTUIColorFromSharedColor(next.swiftStyle.${field.name}); if (c) style[@"${field.name}"] = c; }`
    }
  })
  .join('\n')}
  [_nativeView configureStyle:style];
  [_nativeView configure:${call[0].expression}
    ${call
      .slice(1)
      .map((argument) => `${argument.label}:${argument.expression}`)
      .join(' ')}];
  [super updateProps:props oldProps:oldProps];
}
- (void)prepareForRecycle { [super prepareForRecycle]; [_nativeView reset];${measured ? ' [_measured reset];' : ''}${objectFields.map(([key]) => ` _${key}Dirty = YES;`).join('')} }
@end
`
    )
  }
  if (Object.keys(payloads).length)
    outputs.set(
      'ios/Generated/OneNativePayloads.swift',
      header +
        Object.entries(payloads)
          .map(
            ([name, payload]) =>
              `struct OneNative${name}: Equatable { ${Object.entries(payload.element)
                .map(([key, type]) => `let ${key}: ${swiftScalar(type)}`)
                .join('; ')} }`
          )
          .join('\n') +
        '\n'
    )
  // the non-iOS entry throws the same way for every control, so it follows the catalog.
  outputs.set(
    'src/generated/unsupportedControls.ts',
    header +
      "import type * as Types from './controlTypes'\n" +
      controls
        .map(
          (
            control
          ) => `function ${control.name}(_props: Types.${control.name}Props): never {
  throw new Error('Swift.${control.name} requires an iOS native build with one-native installed')
}\n`
        )
        .join('') +
      `export const unsupportedControls = { ${controls.map((control) => control.name).join(', ')} }\n`
  )
  outputs.set('src/generated/controlTypes.ts', types)
  outputs.set('src/generated/Controls.native.tsx', adapters)
  return { schema, payloads }
}
