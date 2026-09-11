import { controls } from './controlCatalog'
import type { Control, ControlField } from './controlTypes'

const swiftType = (type: string) =>
  ({
    string: 'String',
    boolean: 'Bool',
    Double: 'Double',
    options: '[OneNativePickerOption]',
  })[type]!
const tsType = (type: string) =>
  ({
    string: 'string',
    boolean: 'boolean',
    Double: 'number',
    options: 'readonly PickerOption[]',
  })[type]!
const nativeType = (type: string) =>
  type === 'options' ? 'ReadonlyArray<PickerOption>' : type
const literal = (value: string | boolean | number) => JSON.stringify(value)
const lower = (name: string) => name[0].toLowerCase() + name.slice(1)
// an enum field defaulting to the empty string means unset; the Swift helper passes self through.
const height = (value: Control['height']) =>
  (value.when ?? [])
    .map(
      (entry) =>
        `${entry.values.map((option) => `${entry.prop} === ${JSON.stringify(option)}`).join(' || ')} ? ${entry.height} : `
    )
    .join('') + value.default
const optionalEnum = (field: ControlField) => Boolean(field.enum) && field.default === ''

export function emitControls(header: string, outputs: Map<string, string>) {
  if (!controls.length) return
  let types =
    header +
    "import type { ViewProps } from 'react-native'\nimport type * as Styles from './swiftui'\nexport type PickerOption = Readonly<{ value: string; label: string }>\n"
  let adapters =
    header +
    "import { Platform } from 'react-native'\nimport { useControlled } from '../controlled'\nimport { assertSwiftUIValue } from './swiftui'\nimport type * as Types from './controlTypes'\n"
  const schema = []
  for (const control of controls) {
    const { name, fields, value, actions = [] } = control
    const nativeName = 'OneNative' + name
    const fieldEntries = Object.entries(fields)
    // derived fields are native-only; option fields travel as an array set outside configure.
    const publicFields = fieldEntries.filter(([, field]) => !field.derived)
    const plainFields = fieldEntries.filter(([, field]) => field.type !== 'options')
    const optionFields = fieldEntries.filter(([, field]) => field.type === 'options')
    const styleFields = publicFields.filter(([, field]) => field.enum)
    const hasOptions = optionFields.length > 0
    const publicValueType = value && (value.publicType ?? tsType(value.type))
    types += `export interface ${name}Props extends Omit<ViewProps, 'children'> {
${
  value
    ? `  ${value.prop}: ${publicValueType}
  ${value.event}: (value: ${publicValueType}) => void
  revision?: number
`
    : ''
}${actions.map((action) => `  ${action.prop}?: () => void\n`).join('')}${publicFields.map(([key, field]) => `  ${key}${field.type === 'options' ? '' : '?'}: ${field.publicType ?? (field.enum ? `Styles.${field.enum}${optionalEnum(field) ? " | ''" : ''}` : tsType(field.type))}`).join('\n')}
}\n`
    const props = {
      ...(value
        ? { value: value.type, acknowledgedEvent: 'Int32', revision: 'Int32' }
        : {}),
      ...Object.fromEntries(
        fieldEntries.map(([key, field]) => [key, nativeType(field.type)])
      ),
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
      ...Object.fromEntries(
        actions.map((action) => [
          `onNative${name}${action.event}`,
          { eventCount: 'Int32' },
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
      actions: actions.map((action) => ({
        publicProp: action.prop,
        event: `onNative${name}${action.event}`,
      })),
      defaultHeight: control.height,
      slots: [],
      interfaceOnly: false,
    })
    const codegenTypes = ['DirectEventHandler', 'Int32', 'Double'].filter((type) => {
      if (type === 'DirectEventHandler') return Object.keys(events).length > 0
      return [
        ...Object.values(props),
        ...Object.values(events).flatMap((fields) => Object.values(fields)),
      ].includes(type)
    })
    outputs.set(
      `src/specs/${nativeName}NativeComponent.ts`,
      header +
        `import type { ViewProps } from 'react-native'
${codegenTypes.length ? `import type { ${codegenTypes.join(', ')} } from 'react-native/Libraries/Types/CodegenTypes'` : ''}
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent'
${hasOptions ? 'type PickerOption = Readonly<{ value: string; label: string }>' : ''}
interface NativeProps extends ViewProps {
${Object.entries(props)
  .map(([key, type]) => `  ${key}: ${type}`)
  .join('\n')}
${Object.entries(events)
  .map(
    ([key, fields]) =>
      `  ${key}?: DirectEventHandler<Readonly<{ ${Object.entries(fields)
        .map(([field, type]) => `${field}: ${type}`)
        .join('; ')} }>>`
  )
  .join('\n')}
}
export default codegenNativeComponent<NativeProps>('${nativeName}')
`
    )
    const parameters = [
      ...(value ? [value.prop, value.event, 'revision = 0'] : []),
      ...actions.map((action) => action.prop),
      ...publicFields.map(([key, field]) =>
        field.type === 'options'
          ? key
          : `${key} = ${field.jsDefault ?? literal(field.default)}`
      ),
      'style',
      '...props',
    ]
    adapters += `import Native${name} from '../specs/${nativeName}NativeComponent'
export function ${name}({ ${parameters.join(', ')} }: Types.${name}Props) {
${control.validate}
${styleFields.map(([key, field]) => `  ${optionalEnum(field) ? `if (${key}) ` : ''}assertSwiftUIValue('${field.enum}', ${key}, Number.parseFloat(String(Platform.Version)))`).join('\n')}
${
  value
    ? `  const controlled = useControlled<{ value: ${tsType(value.type)}; eventCount: number; revision: number }>(event => ${value.event}(${value.eventValue ?? 'event.value'}), revision)\n`
    : ''
}  return <Native${name} {...props} style={[{ height: ${height(control.height)} }, style]}
${value ? `    value={${value.nativeValue ?? value.prop}} acknowledgedEvent={controlled.acknowledgedEvent} revision={revision}\n` : ''}${fieldEntries.map(([key, field]) => `    ${key}={${field.nativeValue ?? key}}`).join('\n')}
${value ? `    onNative${name}ValueChange={({ nativeEvent }) => controlled.onNativeChange(nativeEvent)}\n` : ''}${actions.map((action) => `    onNative${name}${action.event}={() => ${action.prop}?.()}\n`).join('')}  />
}
`
    const swiftFields = fieldEntries
      .map(
        ([key, field]) =>
          `  @Published var ${key}: ${swiftType(field.type)} = ${field.type === 'options' ? '[]' : literal(field.default)}`
      )
      .join('\n')
    const configure = [
      ...(value
        ? [
            { label: '_ value', type: swiftType(value.type) },
            { label: 'acknowledgedEvent', type: 'Int' },
            { label: 'revision', type: 'Int' },
          ]
        : []),
      ...plainFields.map(([key, field]) => ({
        label: key,
        type: swiftType(field.type),
      })),
    ]
    // objective-c names the selector from the first label, so it is always unlabeled.
    if (!value && configure.length) configure[0].label = `_ ${configure[0].label}`
    outputs.set(
      `ios/Generated/${nativeName}View.swift`,
      header +
        `import SwiftUI
import UIKit
${hasOptions ? 'struct OneNativePickerOption: Equatable { let value: String; let label: String }' : ''}
private final class ${name}Model: ObservableObject {
${value ? `  @Published var controlled = OneNativeControlled<${swiftType(value.type)}>(${literal(value.initial)})\n` : ''}${swiftFields}
  var active = false
${
  value
    ? `  var onChange: ((${swiftType(value.type)}, Int, Int) -> Void)?
  func change(_ value: ${swiftType(value.type)}) {
    guard active, !disabled, controlled.value != value else { return }
    controlled.change(value)
    onChange?(value, controlled.eventCount, controlled.revision)
  }
`
    : ''
}${actions
          .map(
            (action) => `  var on${action.event}: ((Int) -> Void)?
  private var ${lower(action.event)}Count = 0
  func ${lower(action.event)}() {
    guard active, !disabled else { return }
    ${lower(action.event)}Count += 1
    on${action.event}?(${lower(action.event)}Count)
  }
`
          )
          .join('')}}
@objcMembers public final class ${nativeName}View: UIView {
${value ? `  public var onChange: ((${swiftType(value.type)}, Int, Int) -> Void)?\n` : ''}${actions.map((action) => `  public var on${action.event}: ((Int) -> Void)?\n`).join('')}  private var model = ${name}Model()
  private var controller: OneNativeHostingController<${name}Content>?
  public override init(frame: CGRect) { super.init(frame: frame) }
  required init?(coder: NSCoder) { fatalError("init(coder:) is unavailable") }
  public func configure(${configure.map((parameter) => `${parameter.label}: ${parameter.type}`).join(', ')}) {
${value ? '    if let next = model.controlled.applying(value, acknowledged: acknowledgedEvent, revision: revision) { model.controlled = next }\n' : ''}${plainFields
          .map(([key]) => `    if model.${key} != ${key} { model.${key} = ${key} }`)
          .join('\n')}
  }
${optionFields
  .map(
    ([key]) =>
      `  public func setOptions(_ options: [[String: String]]) { model.${key} = options.map { OneNativePickerOption(value: $0["value"]!, label: $0["label"]!) } }`
  )
  .join('\n')}

  public override func didMoveToWindow() { super.didMoveToWindow(); updateHost() }
  public override func layoutSubviews() { super.layoutSubviews(); updateHost() }
  private func updateHost() {
    model.active = false
    guard window != nil else { controller?.detach(); return }
    if controller == nil {
${value ? '      model.onChange = { [weak self] value, count, revision in self?.onChange?(value, count, revision) }\n' : ''}${actions.map((action) => `      model.on${action.event} = { [weak self] count in self?.on${action.event}?(count) }\n`).join('')}      controller = OneNativeHostingController(rootView: ${name}Content(model: model))
    }
    controller?.attach(to: self)
    model.active = controller?.parent != nil
  }
  public func reset() {
    model.active = false${value ? '; model.onChange = nil' : ''}${actions.map((action) => `; model.on${action.event} = nil`).join('')}
    controller?.detach(); controller = nil; model = ${name}Model()
  }
}
private struct ${name}Content: View {
  @ObservedObject var model: ${name}Model
  var body: some View {
    ${control.swift}
      .disabled(model.disabled)
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
  }
}
${control.extraSwift ?? ''}
`
    )
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
    const objcValue = value
      ? { string: 'NSString *', boolean: 'BOOL ', Double: 'double ' }[value.type]
      : ''
    const cppValue = value
      ? {
          string: 'std::string(value.UTF8String)',
          boolean: '(bool)value',
          Double: '(double)value',
        }[value.type]
      : ''
    const convert = (key: string, field: Pick<ControlField, 'type'>) =>
      field.type === 'string'
        ? `RCTNSStringFromString(next.${key})`
        : field.type === 'options'
          ? key
          : `next.${key}`
    const call = [
      ...(value
        ? [
            { label: '', expression: convert('value', { type: value.type }) },
            { label: 'acknowledgedEvent', expression: 'next.acknowledgedEvent' },
            { label: 'revision', expression: 'next.revision' },
          ]
        : []),
      ...plainFields.map(([key, field]) => ({
        label: key,
        expression: convert(key, field),
      })),
    ]
    outputs.set(
      `ios/Generated/${nativeName}ComponentView.mm`,
      header +
        `#import "${nativeName}ComponentView.h"
#import "OneNative-Swift.h"
#import <react/renderer/components/OneNativeSpec/ComponentDescriptors.h>
#import <react/renderer/components/OneNativeSpec/EventEmitters.h>
#import <React/RCTConversions.h>
using namespace facebook::react;
@implementation ${nativeName}ComponentView { ${nativeName}View *_nativeView; ${hasOptions ? 'BOOL _optionsDirty;' : ''} }
+ (ComponentDescriptorProvider)componentDescriptorProvider { return concreteComponentDescriptorProvider<${nativeName}ComponentDescriptor>(); }
- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const ${nativeName}Props>();
${hasOptions ? '    _optionsDirty = YES;\n' : ''}    _nativeView = [${nativeName}View new]; self.contentView = _nativeView;
    __weak ${nativeName}ComponentView *weakSelf = self;
${
  value
    ? `    _nativeView.onChange = ^(${objcValue}value, NSInteger eventCount, NSInteger revision) {
      ${nativeName}ComponentView *strongSelf = weakSelf;
      if (!strongSelf || !strongSelf->_eventEmitter) return;
      auto emitter = std::static_pointer_cast<const ${nativeName}EventEmitter>(strongSelf->_eventEmitter);
      emitter->onNative${name}ValueChange({.value = ${cppValue}, .eventCount = (int)eventCount, .revision = (int)revision});
    };
`
    : ''
}${actions
          .map(
            (action) => `    _nativeView.on${action.event} = ^(NSInteger eventCount) {
      ${nativeName}ComponentView *strongSelf = weakSelf;
      if (!strongSelf || !strongSelf->_eventEmitter) return;
      auto emitter = std::static_pointer_cast<const ${nativeName}EventEmitter>(strongSelf->_eventEmitter);
      emitter->onNative${name}${action.event}({.eventCount = (int)eventCount});
    };
`
          )
          .join('')}  }
  return self;
}
- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
  const auto &next = *std::static_pointer_cast<const ${nativeName}Props>(props);
${optionFields
  .map(
    ([
      key,
    ]) => `  const auto &previous = *std::static_pointer_cast<const ${nativeName}Props>(_props);
  bool changed = _optionsDirty || previous.${key}.size() != next.${key}.size();
  if (!changed) for (size_t i = 0; i < next.${key}.size(); i++) {
    if (previous.${key}[i].value != next.${key}[i].value || previous.${key}[i].label != next.${key}[i].label) { changed = true; break; }
  }
  if (changed) {
    NSMutableArray *options = [NSMutableArray new];
    for (const auto &option : next.${key}) [options addObject:@{@"value": RCTNSStringFromString(option.value), @"label": RCTNSStringFromString(option.label)}];
    [_nativeView setOptions:options];
    _optionsDirty = NO;
  }`
  )
  .join('\n')}

  [_nativeView configure:${call[0].expression}
    ${call
      .slice(1)
      .map((argument) => `${argument.label}:${argument.expression}`)
      .join(' ')}];
  [super updateProps:props oldProps:oldProps];
}
- (void)prepareForRecycle { [super prepareForRecycle]; [_nativeView reset]; ${hasOptions ? '_optionsDirty = YES;' : ''} }
@end
`
    )
  }
  outputs.set('src/generated/controlTypes.ts', types)
  outputs.set('src/generated/Controls.native.tsx', adapters)
  return schema
}
