import { controls } from './controlCatalog'
import type { ControlField } from './controlTypes'

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
    const { name, fields, valueType } = control
    const nativeName = 'OneNative' + name
    const fieldEntries = Object.entries(fields)
    const styleFields = fieldEntries.filter(([, field]) => field.enum)
    const hasOptions = fieldEntries.some(([, field]) => field.type === 'options')
    const publicValueType = control.publicValueType ?? tsType(valueType)
    types += `export interface ${name}Props extends Omit<ViewProps, 'children'> {
  ${control.valueProp}: ${publicValueType}
  ${control.event}: (value: ${publicValueType}) => void
  revision?: number
${fieldEntries.map(([key, field]) => `  ${key}${field.type === 'options' ? '' : '?'}: ${field.publicType ?? (field.enum ? `Styles.${field.enum}` : tsType(field.type))}`).join('\n')}
}\n`
    const props = {
      value: valueType,
      acknowledgedEvent: 'Int32',
      revision: 'Int32',
      ...Object.fromEntries(
        fieldEntries.map(([key, field]) => [key, nativeType(field.type)])
      ),
    }
    schema.push({
      name: nativeName,
      publicName: name,
      props,
      events: {
        [`onNative${name}ValueChange`]: {
          value: valueType,
          eventCount: 'Int32',
          revision: 'Int32',
        },
      },
      slots: [],
      interfaceOnly: false,
    })
    outputs.set(
      `src/specs/${nativeName}NativeComponent.ts`,
      header +
        `import type { ViewProps } from 'react-native'
import type { DirectEventHandler, Int32, Double } from 'react-native/Libraries/Types/CodegenTypes'
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent'
${hasOptions ? 'type PickerOption = Readonly<{ value: string; label: string }>' : ''}
interface NativeProps extends ViewProps {
${Object.entries(props)
  .map(([key, type]) => `  ${key}: ${type}`)
  .join('\n')}
  onNative${name}ValueChange?: DirectEventHandler<Readonly<{ value: ${valueType}; eventCount: Int32; revision: Int32 }>>
}
export default codegenNativeComponent<NativeProps>('${nativeName}')
`
    )
    adapters += `import Native${name} from '../specs/${nativeName}NativeComponent'
export function ${name}({ ${control.valueProp}, ${control.event}, revision = 0, ${fieldEntries.map(([key, field]) => (field.type === 'options' ? key : `${key} = ${field.jsDefault ?? literal(field.default)}`)).join(', ')}, style, ...props }: Types.${name}Props) {
${control.validate}
${styleFields.map(([key, field]) => `  assertSwiftUIValue('${field.enum}', ${key}, Number.parseFloat(String(Platform.Version)))`).join('\n')}
  const controlled = useControlled<{ value: ${tsType(valueType)}; eventCount: number; revision: number }>(event => ${control.event}(${control.eventValue ?? 'event.value'}), revision)
  return <Native${name} {...props} style={[{ height: ${control.height} }, style]}
    value={${control.nativeValue ?? control.valueProp}} acknowledgedEvent={controlled.acknowledgedEvent} revision={revision}
${fieldEntries.map(([key, field]) => `    ${key}={${field.nativeValue ?? key}}`).join('\n')}
    onNative${name}ValueChange={({ nativeEvent }) => controlled.onNativeChange(nativeEvent)} />
}
`
    const swiftFields = fieldEntries
      .map(
        ([key, field]) =>
          `  @Published var ${key}: ${swiftType(field.type)} = ${field.type === 'options' ? '[]' : literal(field.default)}`
      )
      .join('\n')
    outputs.set(
      `ios/Generated/${nativeName}View.swift`,
      header +
        `import SwiftUI
import UIKit
${hasOptions ? 'struct OneNativePickerOption: Equatable { let value: String; let label: String }' : ''}
private final class ${name}Model: ObservableObject {
  @Published var controlled = OneNativeControlled<${swiftType(valueType)}>(${literal(control.initial)})
${swiftFields}
  var active = false
  var onChange: ((${swiftType(valueType)}, Int, Int) -> Void)?
  func change(_ value: ${swiftType(valueType)}) {
    guard active, !disabled, controlled.value != value else { return }
    controlled.change(value)
    onChange?(value, controlled.eventCount, controlled.revision)
  }
}
@objcMembers public final class ${nativeName}View: UIView {
  public var onChange: ((${swiftType(valueType)}, Int, Int) -> Void)?
  private var model = ${name}Model()
  private var controller: OneNativeHostingController<${name}Content>?
  public override init(frame: CGRect) { super.init(frame: frame) }
  required init?(coder: NSCoder) { fatalError("init(coder:) is unavailable") }
  public func configure(_ value: ${swiftType(valueType)}, acknowledgedEvent: Int, revision: Int, ${fieldEntries
    .filter(([, field]) => field.type !== 'options')
    .map(([key, field]) => `${key}: ${swiftType(field.type)}`)
    .join(', ')}) {
    if let next = model.controlled.applying(value, acknowledged: acknowledgedEvent, revision: revision) { model.controlled = next }
${fieldEntries
  .filter(([, field]) => field.type !== 'options')
  .map(([key]) => `    if model.${key} != ${key} { model.${key} = ${key} }`)
  .join('\n')}
  }
${fieldEntries
  .filter(([, field]) => field.type === 'options')
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
      model.onChange = { [weak self] value, count, revision in self?.onChange?(value, count, revision) }
      controller = OneNativeHostingController(rootView: ${name}Content(model: model))
    }
    controller?.attach(to: self)
    model.active = controller?.parent != nil
  }
  public func reset() {
    model.active = false; model.onChange = nil
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
    const cppValue =
      valueType === 'string'
        ? 'std::string(value.UTF8String)'
        : valueType === 'boolean'
          ? '(bool)value'
          : '(double)value'
    const objcValue =
      valueType === 'string'
        ? 'NSString *'
        : valueType === 'boolean'
          ? 'BOOL '
          : 'double '
    const convert = (key: string, field: Pick<ControlField, 'type'>) =>
      field.type === 'string'
        ? `RCTNSStringFromString(next.${key})`
        : field.type === 'options'
          ? key
          : `next.${key}`
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
    _nativeView.onChange = ^(${objcValue}value, NSInteger eventCount, NSInteger revision) {
      ${nativeName}ComponentView *strongSelf = weakSelf;
      if (!strongSelf || !strongSelf->_eventEmitter) return;
      auto emitter = std::static_pointer_cast<const ${nativeName}EventEmitter>(strongSelf->_eventEmitter);
      emitter->onNative${name}ValueChange({.value = ${cppValue}, .eventCount = (int)eventCount, .revision = (int)revision});
    };
  }
  return self;
}
- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
  const auto &next = *std::static_pointer_cast<const ${nativeName}Props>(props);
${fieldEntries
  .filter(([, field]) => field.type === 'options')
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

  [_nativeView configure:${convert('value', { type: valueType })} acknowledgedEvent:next.acknowledgedEvent revision:next.revision
    ${fieldEntries
      .filter(([, field]) => field.type !== 'options')
      .map(([key, field]) => `${key}:${convert(key, field)}`)
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
