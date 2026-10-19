// a container's native host is generated: its Fabric component view, its Swift view and
// the SwiftUI call that wraps React's children. the call comes from the SDK: the
// initializer whose labels the recipe names, each argument's conversion from the
// argument's SDK type, and the availability gate from the initializer's attributes. a
// recipe says only what a signature cannot: which prop fills which label, which view
// builder takes React's children, and how the host owns its layout.
import { bridgeValueOf } from './deriveSDK'
import { ios, present, type Declaration } from './inventory'
import { sdkGuard } from './sdkGuard'

export type HostRecipe = {
  // the public SDK view, as SwiftUI names it
  view?: string
  // or the SDK modifier the host applies to React's children, stacked in `childStack`.
  // its labels fill as an initializer's do
  modifier?: string
  // the modifier draws a surface: it applies to a clear view behind the stacked children,
  // so each child keeps its own accessibility frame, and `modifiers` lay out the stack
  // the surface fills
  surface?: boolean
  // methods of an argument's SDK type called on its converted value: an argument label to
  // each method and the prop that fills the method's one parameter
  chains?: Record<string, Record<string, string>>
  // a view builder label that shows the `slot` React mounts among the children, which
  // SwiftUI presents outside the surface while the binding is true. `modifiers` apply to
  // the presented content, `@prop` as below
  presented?: { label: string; slot: string; modifiers?: readonly string[] }
  // a data label that takes identified items React sends as JSON in `prop`, each
  // { id } plus, with `children`, that key path's label and its nested items. the
  // children builder runs per item and shows the `slot` rows whose `key` prop is the
  // item's id
  items?: { label: string; prop: string; children?: string; slot: string; key: string }
  // a columns label whose builder makes a `column` per item of the JSON `prop`, each
  // { id, title }, through the `each` view that builds columns from data. a cell shows
  // the `items` slot rows whose `key` prop is the column's id. while the `sortable`
  // prop is true, each header sorts through `sortUsing` and the binding, and React
  // re-sorts the rows, so comparing never reorders them
  columns?: {
    label: string
    prop: string
    each: string
    column: string
    key: string
    sortUsing: string
    sortable: string
  }
  // initializer label to the prop that fills it. a view builder label takes `Text(prop)`.
  arguments?: Record<string, string>
  // the view builder label that takes React's children
  children?: string
  // text builders whose initializer is chosen without them while their prop is empty
  omitWhenEmpty?: readonly string[]
  // a view builder label that shows a title with an optional SF Symbol, from two props
  labels?: Record<string, { title: string; systemImage: string }>
  // an argument whose SDK type has no value bridge, as a Swift expression; `@prop` is the
  // prop's model value
  values?: Record<string, string>
  // the prop shown as text while React passes no children
  childrenFallback?: string
  // a prop's model value before React's first props, as a Swift literal, where the SDK
  // gives the prop no default its conversion accepts
  initial?: Record<string, string>
  // values a prop takes beyond the SDK's case names, as Swift expressions
  aliases?: Record<string, Record<string, string>>
  // applied to the children inside the view builder
  childModifier?: string
  // a stack the children share inside the view builder, where the SDK view would lay
  // each child out on its own
  childStack?: string
  // modifiers SwiftUI applies to the call before the container's style; `$label` is
  // that argument's converted value and `@prop` the prop's model value
  modifiers?: readonly string[]
  // leaf: no children; container: lays out in its parent's box; measured: reports the
  // height SwiftUI measured to Yoga while standalone
  layout: 'leaf' | 'container' | 'measured'
  // measured only while the height is not set from React
  boundedHeight?: boolean
  // measured only while this Swift condition holds; `@prop` is the prop's model value
  measuredWhen?: string
  // an initializer label that takes a Binding React controls: the value comes from
  // `prop` with the acknowledgedEvent and revision props, and a change the user makes
  // reaches React through `event`
  binding?: { label: string; prop: string; event: string }
  // an initializer label that takes the closure SwiftUI runs on a tap. each run while the
  // host is active reaches React through `event` with its count
  action?: { label: string; event: string }
  // the SwiftUI view carries React's accessibility props and testID, so a test finds the
  // view itself rather than the host around it. a `container` is no element of its own,
  // so it contains its children's elements while it carries the props
  accessible?: boolean | 'container'
  // an initializer label that takes a Binding<Set<String>> of row tags. React sends
  // `prop` as a JSON array and says through `controlled` whether it owns it; the user's
  // selection reaches React through `event` as a JSON array
  selection?: { label: string; prop: string; controlled: string; event: string }
  // where several SDK initializers take the recipe's labels, the one whose parameter
  // type for a label contains this text
  types?: Record<string, string>
  // takes the environment props (color scheme, type size, control size, locale, tint,
  // enabled) and applies them around the view
  environment?: boolean
  // standalone, follow the color scheme of the window it sits in
  scheme?: boolean
  // with no swiftStyle, apply nothing, so a transparent group adds no layer
  skipEmptyStyle?: boolean
  // Swift for isRowModifier(name): the modifiers SwiftUI reads from the row itself
  rowModifiers?: string
  // the value SwiftUI hands the children builder. `values` reads members of it into
  // `event`: an event field prefix to a member, such as `frame(in: .global)`, each
  // flattened by its SDK type. `commands` calls its methods from React: a spec command
  // to the method it runs, queued until the content first appears
  context?: { event?: string; values?: Record<string, string>; commands?: Record<string, string> }
  // an initializer label whose generic type the SDK builds with static members of the
  // protocol it conforms to: `prop` names the member, and `arguments` fills the members'
  // labels from props. a member with overloads is the one that takes the most of them.
  // `optional` leaves the label out while the prop is empty, so the SDK default applies
  builder?: {
    label: string
    prop: string
    members: readonly string[]
    arguments: Record<string, string>
    optional?: boolean
  }
}

// a row of a data-driven view: React's content for one item, which the view finds by the
// row's key props
export type KeyedRecipe = { keys: readonly string[] }

// the content a presenting host shows outside the surface, which its own touch handler
// serves as React Native's Modal does
export type SlotRecipe = { slot: 'presented' }

type HostComponent = {
  name: string
  publicName: string | null
  props: Record<string, string>
  events?: Record<string, Record<string, string>>
  commands?: Record<string, Record<string, string>>
  host?: HostRecipe | KeyedRecipe | SlotRecipe
}

type Argument = {
  label: string
  prop: string
  // the expression SwiftUI receives, or the view builder body
  swift: string
  closure: boolean
  // the name a closure gives the value SwiftUI hands it
  parameter?: string
  // a generated conversion function
  convert?: string
  // a URL the call unwraps first, from this string
  url?: string
}

// every line after the first, which the caller places
const indent = (text: string, by: number) =>
  text
    .replaceAll('\n', `\n${' '.repeat(by)}`)
    .replace(/\n +\n/g, '\n\n')
    .replace(/\n +(#)/g, '\n$1')
const upper = (name: string) => name[0].toUpperCase() + name.slice(1)
const swiftField = (type: string) =>
  type.startsWith('boolean') ? 'Bool' : type.startsWith('Double') ? 'Double' : type.startsWith('ColorValue') ? 'UIColor?' : 'String'
// the props OneNativeEnvironmentModel.configure takes, in its order
const ENVIRONMENT = ['colorScheme', 'dynamicTypeSize', 'controlSize', 'locale', 'tint', 'isEnabled']
const objcArgument = (prop: string, type: string) =>
  type.startsWith('string')
    ? `RCTNSStringFromString(next.${prop})`
    : type.startsWith('ColorValue')
      ? `next.${prop} ? RCTUIColorFromSharedColor(next.${prop}) : nil`
      : `next.${prop}`
const NUMBERS = ['Swift.Double', 'Swift.Float', 'Swift.Int', 'CoreFoundation.CGFloat']
// core graphics lies outside the swiftui inventory, so its geometry is spelled here: a
// field to its path on the value
const GEOMETRY: Record<string, Record<string, string>> = {
  'CoreFoundation.CGRect': { x: 'origin.x', y: 'origin.y', width: 'size.width', height: 'size.height' },
  'CoreFoundation.CGSize': { width: 'width', height: 'height' },
  'CoreFoundation.CGPoint': { x: 'x', y: 'y' },
}
// a type as declarations name their owner: no generic arguments or module
const ownerKey = (type: string) => {
  let key = type.replace(/\?$/, '')
  while (/<[^<>]*>/.test(key)) key = key.replace(/<[^<>]*>/g, '')
  return key.replace(/^(SwiftUI|SwiftUICore|_\w+_SwiftUI)\./, '')
}
// the field a member's part arrives in: the prefix itself, or the prefix and the part
const fieldName = (prefix: string, part: string) => (prefix ? `${prefix}${upper(part)}` : part)
// where a built argument goes in a call, before each member fills it
const BUILT = '<built>'
const objcType = (type: string) =>
  type.startsWith('string') ? 'NSString *' : type.startsWith('boolean') ? 'BOOL' : 'double'

function emitKeyedRow(
  header: string,
  outputs: Map<string, string>,
  component: HostComponent,
  recipe: KeyedRecipe
) {
  const name = component.name
  const short = name.replace(/^OneNative/, '')
  for (const key of recipe.keys)
    if (component.props[key] !== 'string') throw new Error(`${name} key ${key} must be a string prop`)
  const keys = recipe.keys
  const described = keys.map((key) => `\\(${key})`).join(' ')
  outputs.set(
    `ios/Generated/${name}View.swift`,
    `${header}import SwiftUI
import UIKit

private struct ${short}Content: View {
  @ObservedObject var children: OneNativeChildren

  var body: some View {
    ForEach(children.items) { child in child.content }
  }
}

// the content React rendered for one item of a data-driven view, which finds it by its
// ${keys.length > 1 ? 'keys' : 'key'} when SwiftUI builds that item
@objcMembers
public final class ${name}View: OneNativeContainerView {
${keys.map((key) => `  public private(set) var ${key} = ""`).join('\n')}

  public init() {
    super.init(styled: { children, _, _ in AnyView(${short}Content(children: children)) })
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) is unavailable") }

  // nothing observes the ${keys.length > 1 ? 'keys' : 'key'}, so a mounted row never changes item: React keys
  // rows by ${keys.length > 1 ? 'them' : 'it'}, and a recycled row is reset first
  public func configure(${keys.map((key) => `${key}: String`).join(', ')}) {
    guard ${keys.map((key) => `self.${key} != ${key}`).join(' || ')} else { return }
    precondition(${keys.map((key) => `self.${key}.isEmpty`).join(' && ')}, "${name} ${keys.map((key) => `\\(self.${key})`).join(' ')} cannot become ${described}")
${keys.map((key) => `    self.${key} = ${key}`).join('\n')}
    refreshComposedIdentity()
  }

  public override func reset() {
${keys.map((key) => `    ${key} = ""`).join('\n')}
    super.reset()
  }
}
`
  )
  outputs.set(
    `ios/Generated/${name}ComponentView.h`,
    `${header}#ifdef __cplusplus
#import "OneNativeContainerComponentView.h"
@interface ${name}ComponentView : OneNativeContainerComponentView
@end
#endif
`
  )
  outputs.set(
    `ios/Generated/${name}ComponentView.mm`,
    `${header}#import "${name}ComponentView.h"
#import <React/RCTView.h>
#import "One-Swift.h"
#import <react/renderer/components/OneNativeSpec/ComponentDescriptors.h>
#import <React/RCTConversions.h>

using namespace facebook::react;

@implementation ${name}ComponentView {
  ${name}View *_nativeView;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<${name}ComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const ${name}Props>();
    _nativeView = [${name}View new];
    self.container = _nativeView;
    self.contentView = _nativeView;
  }
  return self;
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
  const auto &next = *std::static_pointer_cast<const ${name}Props>(props);
  [_nativeView configureWith${upper(keys[0])}:RCTNSStringFromString(next.${keys[0]})${keys
    .slice(1)
    .map((key) => `\n      ${key}:RCTNSStringFromString(next.${key})`)
    .join('')}];
  [super updateProps:props oldProps:oldProps];
}

@end
`
  )
}

function emitPresentedSlot(header: string, outputs: Map<string, string>, component: HostComponent) {
  const name = component.name
  outputs.set(
    `ios/Generated/${name}ComponentView.h`,
    `${header}#ifdef __cplusplus
#import <React/RCTViewComponentView.h>
@interface ${name}ComponentView : RCTViewComponentView
- (void)updateNativeFrame:(CGRect)frame;
- (void)setMeasuredSizeCallback:(void (^)(CGSize size))callback;
@end
#endif
`
  )
  outputs.set(
    `ios/Generated/${name}ComponentView.mm`,
    `${header}#include <cmath>
#import "${name}ComponentView.h"
#import "${name}ShadowNode.h"
#import <React/RCTSurfaceTouchHandler.h>

using namespace facebook::react;

@implementation ${name}ComponentView {
  ${name}ShadowNode::ConcreteState::Shared _slotState;
  RCTSurfaceTouchHandler *_touchHandler;
  void (^_measuredSizeCallback)(CGSize);
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<${name}ComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const ${name}Props>();
    // presentation leaves the RN surface, as it does for React Native's Modal
    _touchHandler = [RCTSurfaceTouchHandler new];
    [_touchHandler attachToView:self];
  }
  return self;
}

- (void)updateState:(State::Shared const &)state oldState:(State::Shared const &)oldState {
  _slotState = std::static_pointer_cast<const ${name}ShadowNode::ConcreteState>(state);
}

// the size SwiftUI gave the presented content, which Yoga lays the children out in
- (void)updateNativeFrame:(CGRect)frame {
  if (!_slotState || !std::isfinite(frame.size.width) || !std::isfinite(frame.size.height)) return;
  const auto &old = _slotState->getData();
  const facebook::react::Size size{(Float)frame.size.width, (Float)frame.size.height};
  if (old.measured && old.size == size) return;
  OneNativeSlotState state;
  state.size = size;
  state.measured = true;
  _slotState->updateState(std::move(state));
}

- (void)setMeasuredSizeCallback:(void (^)(CGSize))callback {
  _measuredSizeCallback = [callback copy];
  [self setNeedsLayout];
}

- (void)updateLayoutMetrics:(LayoutMetrics const &)layoutMetrics oldLayoutMetrics:(LayoutMetrics const &)oldLayoutMetrics {
  [super updateLayoutMetrics:layoutMetrics oldLayoutMetrics:oldLayoutMetrics];
  // SwiftUI owns placement. Fabric owns the bounds and the descendants' layout
  self.frame = (CGRect){CGPointZero, self.bounds.size};
}

- (void)layoutSubviews {
  [super layoutSubviews];
  CGFloat width = 0;
  CGFloat height = 0;
  for (UIView *subview in self.subviews) {
    if (subview.hidden) continue;
    width = MAX(width, CGRectGetMaxX(subview.frame));
    height = MAX(height, CGRectGetMaxY(subview.frame));
  }
  if (_measuredSizeCallback && std::isfinite(width) && std::isfinite(height) && width > 0 && height > 0)
    _measuredSizeCallback(CGSizeMake(width, height));
}

- (void)prepareForRecycle {
  [super prepareForRecycle];
  _touchHandler.enabled = NO;
  _touchHandler.enabled = YES;
  _slotState.reset();
  _measuredSizeCallback = nil;
}

@end
`
  )
  outputs.set(
    `cpp/${name}ShadowNode.h`,
    `${header}#pragma once
#ifdef __cplusplus
#include <react/renderer/components/OneNativeSpec/EventEmitters.h>
#include <react/renderer/components/OneNativeSpec/Props.h>
#include "OneNativeSlotShadowNode.h"
namespace facebook::react {
extern const char ${name}ComponentName[];
using ${name}ShadowNode = OneNativeSlotShadowNode<${name}ComponentName, ${name}Props, ${name}EventEmitter>;
using ${name}ComponentDescriptor = OneNativeSlotComponentDescriptor<${name}ShadowNode>;
}
#endif
`
  )
  outputs.set(
    `cpp/${name}ShadowNode.cpp`,
    `${header}#include "${name}ShadowNode.h"

namespace facebook::react {
extern const char ${name}ComponentName[] = "${name}";
}
`
  )
}

export function emitContainerHosts(
  header: string,
  outputs: Map<string, string>,
  inventory: readonly Declaration[],
  floor: number,
  ceiling: number,
  components: readonly HostComponent[]
) {
  const valueOf = bridgeValueOf(inventory, ceiling)
  const hosted = components.filter((component) => component.host)
  for (const component of hosted) {
    if ('keys' in component.host!) {
      emitKeyedRow(header, outputs, component, component.host)
      continue
    }
    if ('slot' in component.host!) {
      emitPresentedSlot(header, outputs, component)
      continue
    }
    const recipe = component.host as HostRecipe
    const name = component.name
    const short = name.replace(/^OneNative/, '')
    const fail = (message: string): never => {
      throw new Error(`${name} host: ${message}`)
    }
    const args = recipe.arguments ?? {}
    const labelProps = Object.values(recipe.labels ?? {}).flatMap(
      ({ title, systemImage }) => [title, systemImage]
    )
    for (const prop of [
      ...Object.values(args),
      ...labelProps,
      ...(recipe.childrenFallback ? [recipe.childrenFallback] : []),
    ])
      if (!(prop in component.props)) fail(`prop ${prop} is not in the spec`)
    const model = (swift: string) =>
      swift.replace(/@(\w+)/g, (_, prop: string) => {
        if (!(prop in component.props)) fail(`@${prop} is not in the spec`)
        return `model.${prop}`
      })
    const eachChild = `ForEach(children.items) { child in child.content }${recipe.childModifier ? `\n  ${recipe.childModifier}` : ''}`
    const childrenBody = recipe.childStack
      ? `${recipe.childStack} {\n  ${indent(eachChild, 2)}\n}`
      : eachChild
    const contentBody = recipe.childrenFallback
      ? `if children.items.isEmpty {\n  Text(model.${recipe.childrenFallback})\n} else {\n  ${indent(childrenBody, 2)}\n}`
      : childrenBody
    const omitted = recipe.omitWhenEmpty ?? []
    const wanted = (without: readonly string[]) =>
      new Set(
        [
          ...Object.keys(args),
          ...Object.keys(recipe.values ?? {}),
          ...Object.keys(recipe.labels ?? {}),
          ...(recipe.children ? [recipe.children] : []),
          ...(recipe.binding ? [recipe.binding.label] : []),
          ...(recipe.action ? [recipe.action.label] : []),
          ...(recipe.selection ? [recipe.selection.label] : []),
          ...(recipe.builder ? [recipe.builder.label] : []),
          ...(recipe.items ? [recipe.items.label, ...(recipe.items.children ? [recipe.items.children] : [])] : []),
          ...(recipe.columns ? [recipe.columns.label] : []),
          ...(recipe.presented ? [recipe.presented.label] : []),
        ].filter((label) => !without.includes(label))
      )
    // the keys a mounted row is found by, in the order its view declares them
    const slotKeys = (() => {
      const items = recipe.items
      if (!items) return []
      const slot = components.find((c) => c.name === items.slot)?.host
      if (!slot || !('keys' in slot)) fail(`items slot ${items.slot} has no keyed host`)
      const keys = (slot as KeyedRecipe).keys
      for (const key of keys)
        if (key !== items.key && key !== recipe.columns?.key) fail(`${items.slot} key ${key} names no item`)
      return keys
    })()
    const rowLookup = slotKeys
      .map((key) => (key === recipe.items?.key ? 'item.id' : 'column.id'))
      .join(', ')

    // the SDK initializer with exactly these labels besides defaulted ones. its generic
    // parameters may be any View or pinned to a type Swift infers from the call; one that
    // asks for other content, such as table rows, is for another builder.
    const initializers = inventory.filter(
      (d) =>
        (recipe.modifier
          ? d.kind === 'func' && d.name === recipe.modifier && ownerKey(d.owner) === 'View'
          : d.kind === 'init' && (d.owner === recipe.view || d.owner.endsWith(`.${recipe.view}`))) &&
        /^(SwiftUI|SwiftUICore|_\w+_SwiftUI)$/.test(d.module) &&
        !d.failable &&
        present(d) &&
        ios(d) <= ceiling &&
        // `deprecated: 100000` marks an API Apple will deprecate; it compiles without warning
        !d.attributes.some((a) => /@available\((iOS|\*),.*deprecated(?!: 100000)/.test(a))
    )
    const initializerFor = (labels: Set<string>) => {
      let matches = initializers.filter(
        (d) =>
          d.parameters.every(
            (p) => labels.has(p.label) || p.defaultValue !== undefined
          ) &&
          [...labels].every((label) => d.parameters.some((p) => p.label === label)) &&
          (d.requirements ?? []).every(
            (r) =>
              /^\w+ : (SwiftUI(Core)?\.View|Swift\.Hashable)$/.test(r) ||
              /^\w+ == /.test(r) ||
              (recipe.items !== undefined && /^[\w.]+ : Swift\.(Identifiable|RandomAccessCollection)$/.test(r)) ||
              // the columns' rows are the items
              (recipe.columns !== undefined &&
                (/^[\w.]+ == [\w.]+$/.test(r) || /^\w+ : Foundation\.SortComparator$/.test(r)))
          ) &&
          // items come as a collection, not one root item
          (!recipe.items ||
            d.parameters.some(
              (p) =>
                p.label === recipe.items!.label &&
                (d.requirements ?? []).some((r) => r.includes(`${p.type}.Element`))
            )) &&
          Object.entries(recipe.types ?? {}).every(([label, text]) =>
            d.parameters.some((p) => p.label === label && p.type.includes(text))
          )
      )
      if (matches.length === 0)
        fail(`no SDK initializer takes ${[...labels].join(', ') || 'no arguments'}`)
      // beside its replacement, an initializer Apple will deprecate is not a choice
      const current = matches.filter(
        (d) => !d.attributes.some((a) => /deprecated/.test(a))
      )
      if (current.length) matches = current
      const signatures = new Set(
        matches.map((d) => d.parameters.map((p) => `${p.label}:${p.type}`).join(','))
      )
      if (signatures.size > 1)
        fail(
          `several SDK initializers take ${[...labels].join(', ')}: ${[...signatures].join(' | ')}`
        )
      return matches[0]
    }

    const presented = recipe.presented
    if (!recipe.view === !recipe.modifier) fail('a host names its view or its modifier')
    if (recipe.modifier && (!recipe.childStack || recipe.children))
      fail('a modifier host stacks the children it modifies')
    if (recipe.surface && (!recipe.modifier || recipe.presented))
      fail('a surface is a modifier drawn behind the children')
    for (const label of Object.keys(recipe.chains ?? {}))
      if (!(label in args)) fail(`chain ${label} is not an argument`)
    if (presented && !recipe.binding) fail('a presented slot shows while its binding is true')
    const presentedSlot = presented && components.find((c) => c.name === presented.slot)?.host
    if (presented && (!presentedSlot || !('slot' in presentedSlot)))
      fail(`presented slot ${presented.slot} has no slot host`)
    // the content React mounted for the presentation, sized by SwiftUI
    const presentedBody = presented
      ? `if let content = model.content {\n  OneNativeSlot(content: content, mode: .presented, onLayout: { frame in\n    if model.active && model.controlled.value { model.onLayout?(frame) }\n  }, measuredWidth: model.measuredWidth, measuredHeight: model.measuredHeight)${(presented.modifiers ?? []).map((modifier) => `\n  ${model(modifier)}`).join('')}\n}`
      : ''

    const conversions: string[] = []
    const context = recipe.context
    const contextValues = Object.entries(context?.values ?? {})
    const contextCommands = Object.entries(context?.commands ?? {})
    // the SDK type of the value SwiftUI hands the children builder
    let contextType = ''
    // the rows React mounted for one item, found in the lookup the body builds once
    const mountedRows = `ForEach(mounted[[${rowLookup}]] ?? []) { row in\n  row.content\n}`
    const argumentFor = (parameter: Declaration['parameters'][number], sorted: boolean): Argument => {
      const label = parameter.label
      if (label === presented?.label) {
        return { label, prop: '', closure: true, swift: presentedBody }
      }
      if (label === recipe.children && recipe.items) {
        return { label, prop: '', closure: true, parameter: 'item', swift: mountedRows }
      }
      if (label === recipe.columns?.label) {
        return { label, prop: '', closure: true, swift: columnsBody(sorted) }
      }
      if (label === recipe.children) {
        if (!context) return { label, prop: '', closure: true, swift: contentBody }
        const handed = /^(?:@escaping )?\((.+)\) -> \w+$/.exec(parameter.type)?.[1]
        if (!handed) fail(`${label}: ${parameter.type} hands its builder no value`)
        contextType = handed!
        // the builder reads the value as it runs, so reading adds no view to the layout
        const read = contextValues.length
          ? `let _ = model.read(${short}Context(context))\n${contentBody}`
          : contentBody
        return {
          label,
          prop: '',
          closure: true,
          parameter: 'context',
          swift: contextCommands.length ? `let _ = model.capture(context)\n${read}` : read,
        }
      }
      if (label === recipe.items?.label) {
        return { label, prop: '', closure: false, swift: 'model.items' }
      }
      if (label === recipe.items?.children) {
        return { label, prop: '', closure: false, swift: '\\.children' }
      }
      if (label === recipe.builder?.label) {
        return { label, prop: '', closure: false, swift: BUILT }
      }
      if (label === recipe.selection?.label) {
        return { label, prop: '', closure: false, swift: 'model.selectionBinding' }
      }
      if (label === recipe.action?.label) {
        if (!/^@escaping (@_Concurrency\.MainActor )?\(\) -> Swift\.Void$/.test(parameter.type))
          fail(`${label}: ${parameter.type} is not an action`)
        return { label, prop: '', closure: false, swift: '{ model.action() }' }
      }
      if (label === recipe.binding?.label && recipe.columns) {
        if (!/^SwiftUICore\.Binding<\[\w+\]>$/.test(parameter.type))
          fail(`${label}: ${parameter.type} is not the sort order a column sorts`)
        return { label, prop: '', closure: false, swift: 'model.sortOrder' }
      }
      if (label === recipe.binding?.label) {
        return {
          label,
          prop: '',
          closure: false,
          // a presentation shows only once its content is mounted
          swift: `Binding(get: { model.controlled.value${presented ? ' && model.content != nil' : ''} }, set: { value in model.change(value) })`,
        }
      }
      const shown = recipe.labels?.[label]
      if (shown) {
        const [title, image] = [`model.${shown.title}`, `model.${shown.systemImage}`]
        return {
          label,
          prop: '',
          closure: true,
          swift: `if !${title}.isEmpty, !${image}.isEmpty {\n  Label(${title}, systemImage: ${image})\n} else if !${image}.isEmpty {\n  Image(systemName: ${image})\n} else if !${title}.isEmpty {\n  Text(${title})\n}`,
        }
      }
      const explicit = recipe.values?.[label]
      if (explicit) {
        if (valueOf(parameter.type))
          fail(`the SDK bridges ${label}: ${parameter.type}; drop its value recipe`)
        return { label, prop: '', closure: false, swift: model(explicit) }
      }
      const prop = args[label]
      const type = component.props[prop]
      if (/^(@escaping )?\(\) -> \w+$/.test(parameter.type)) {
        if (!type.startsWith('string'))
          fail(`${label} is a view builder, so ${prop} must be a string`)
        return {
          label,
          prop,
          closure: true,
          swift: omitted.includes(label)
            ? `Text(model.${prop})`
            : `if !model.${prop}.isEmpty { Text(model.${prop}) }`,
        }
      }
      const value = valueOf(parameter.type)
      if (!value) fail(`${label}: ${parameter.type} has no SDK value bridge`)
      const field = `model.${prop}`
      if (value!.kind === 'enum') {
        if (!type.startsWith('string'))
          fail(`${prop} carries ${parameter.type}, so it must be a string`)
        const base = parameter.type.replace(/\?$/, '')
        const fn = `oneNative${short}${upper(prop)}`
        const aliases = recipe.aliases?.[prop] ?? {}
        // a type newer than the floor makes the conversion as new as the type
        const declared = inventory.find(
          (d) => ['struct', 'enum'].includes(d.kind) && d.owner === '' && d.name === ownerKey(base) && present(d)
        )
        const since = declared && ios(declared) > floor ? ios(declared) : floor
        const cases = [
          ...(value!.optional ? ['  case "": return nil'] : []),
          ...value!.cases!.map((item) =>
            item.ios > since
              ? `  case ${JSON.stringify(item.name)}:${sdkGuard(item.ios, `    if #available(iOS ${item.ios}, *) { return ${base}.${item.name} }`, '')}\n    preconditionFailure("${name} ${prop} ${item.name} requires iOS ${item.ios}")`
              : `  case ${JSON.stringify(item.name)}: return ${base}.${item.name}`
          ),
          ...Object.entries(aliases).map(
            ([alias, swift]) => `  case ${JSON.stringify(alias)}: return ${swift}`
          ),
        ]
        if (!conversions.some((c) => c.includes(` ${fn}(`)))
          conversions.push(`${since > floor ? `@available(iOS ${since}, *)\n` : ''}private func ${fn}(_ value: String) -> ${parameter.type} {
  switch value {
${cases.join('\n')}
  default: preconditionFailure("invalid ${name} ${prop}: \\(value)")
  }
}`)
        return { label, prop, closure: false, swift: `${fn}(${field})`, convert: fn }
      }
      if (value!.kind === 'number') {
        const base = parameter.type.replace(/\?$/, '')
        const numeric = (expression: string) =>
          base === 'Swift.Double'
            ? expression
            : `${base.split('.').at(-1)}(${expression})`
        if (type.startsWith('string')) {
          // a string carries an optional number without reserving a numeric value: "null" is nil
          if (!value!.optional)
            fail(`${prop} is a string but ${parameter.type} is not optional`)
          const fn = `oneNative${short}${upper(prop)}`
          conversions.push(`private func ${fn}(_ value: String) -> ${parameter.type} {
  if value == "null" { return nil }
  guard let number = Double(value), number.isFinite else { preconditionFailure("invalid ${name} ${prop}: \\(value)") }
  return ${numeric('number')}
}`)
          return { label, prop, closure: false, swift: `${fn}(${field})` }
        }
        if (!type.startsWith('Double'))
          fail(`${prop} carries ${parameter.type}, so it must be a number`)
        if (!value!.optional)
          return { label, prop, closure: false, swift: numeric(field) }
        // an optional number is nil while its has-prop is false, or while it is negative,
        // which is how React Native says the caller left it out
        const has = `has${upper(prop)}`
        return {
          label,
          prop,
          closure: false,
          swift:
            has in component.props
              ? `(model.${has} ? ${numeric(field)} : nil)`
              : `(${field} >= 0 ? ${numeric(field)} : nil)`,
        }
      }
      if (value!.kind === 'boolean') {
        if (!type.startsWith('boolean'))
          fail(`${prop} carries ${parameter.type}, so it must be a boolean`)
        return { label, prop, closure: false, swift: field }
      }
      if (value!.kind === 'url') {
        // a string Foundation rejects renders the children without the view
        if (value!.optional)
          return {
            label,
            prop,
            closure: false,
            swift: `(${field}.isEmpty ? nil : Foundation.URL(string: ${field}))`,
          }
        return { label, prop, closure: false, swift: label, url: field }
      }
      if (value!.kind === 'string') return { label, prop, closure: false, swift: field }
      return fail(
        `${label}: ${parameter.type} bridges as ${value!.kind}, which a host argument cannot take`
      )
    }

    // a call per member the built argument can be, chosen by the member's prop
    const builder = recipe.builder
    // `bare` is the call without the builder label, shown while an optional builder's prop
    // is empty
    const builtCall = (initializer: Declaration, call: string, bare?: string) => {
      if (!builder || !call.includes(BUILT)) return call
      const parameter = initializer.parameters.find((p) => p.label === builder.label)!
      // the view's own generic constraint is recorded on its members, not its initializers;
      // an opaque parameter names its protocol
      const conformance =
        /^some ([\w.]+)$/.exec(parameter.type)?.[1] ??
        inventory
          .filter((d) => d === initializer || ownerKey(d.owner).startsWith(ownerKey(initializer.owner)))
          .flatMap((d) => d.requirements ?? [])
          .map((r) => new RegExp(`^${parameter.type} : (.+)$`).exec(r)?.[1])
          .find(Boolean)
      if (!conformance) fail(`${builder.label}: ${parameter.type} is not a generic the SDK builds`)
      if (builder.optional && parameter.defaultValue === undefined)
        fail(`${builder.label} has no SDK default to leave the label out for`)
      const cases = builder.members.map((member) => {
        const usable = inventory.filter(
          (d) =>
            ownerKey(d.owner) === ownerKey(conformance!) &&
            d.name === member &&
            (d.requirements ?? []).some((r) => r.startsWith('Self == ')) &&
            present(d) &&
            ios(d) <= floor &&
            d.parameters.every((p) => p.label in builder.arguments || p.defaultValue !== undefined)
        )
        const taken = (d: Declaration) => d.parameters.filter((p) => p.label in builder.arguments).length
        const most = Math.max(...usable.map(taken))
        const found = usable.filter((d) => taken(d) === most)
        if (found.length !== 1) fail(`${conformance} has ${found.length} members named ${member} taking the most builder arguments`)
        const [declaration] = found
        const element = (type: string) =>
          (declaration.requirements ?? [])
            .map((r) => new RegExp(`^${type}\\.Element == (.+)$`).exec(r)?.[1])
            .find(Boolean)
        const passed = declaration.parameters.flatMap((p) => {
          const prop = builder.arguments[p.label]
          if (prop === undefined) {
            if (p.defaultValue === undefined) fail(`${member} ${p.label} takes no prop`)
            return []
          }
          const kind = component.props[prop] ?? fail(`builder prop ${prop} is not in the spec`)
          let value: string
          if (p.type === 'Foundation.Date' && kind.startsWith('Double'))
            value = `Date(timeIntervalSince1970: model.${prop} / 1000)`
          else if ((NUMBERS.includes(p.type) || p.type === 'Foundation.TimeInterval') && kind.startsWith('Double'))
            value = p.type === 'Swift.Double' || p.type === 'Foundation.TimeInterval' ? `model.${prop}` : `${p.type.split('.').at(-1)}(model.${prop})`
          else if (p.type === 'Swift.Bool' && kind.startsWith('boolean')) value = `model.${prop}`
          else if (element(p.type) === 'Foundation.Date' && kind.startsWith('string')) {
            // dates arrive as a JSON array of ms since the epoch
            const fn = `oneNative${short}${upper(prop)}`
            if (!conversions.some((c) => c.includes(` ${fn}(`)))
              conversions.push(`private func ${fn}(_ value: String) -> [Date] {
  guard let times = try? JSONDecoder().decode([Double].self, from: Data(value.utf8)) else {
    preconditionFailure("invalid ${name} ${prop}: \\(value)")
  }
  return times.map { Date(timeIntervalSince1970: $0 / 1000) }
}`)
            value = `${fn}(model.${prop})`
          } else return fail(`${member} ${p.label}: ${p.type} cannot come from ${prop}: ${kind}`)
          return [p.label === '_' ? value : `${p.label}: ${value}`]
        })
        const built = declaration.kind === 'func' ? `.${member}(${passed.join(', ')})` : `.${member}`
        return `case ${JSON.stringify(member)}:\n  ${indent(call.replace(BUILT, built), 2)}`
      })
      if (bare !== undefined) cases.unshift(`case "":\n  ${indent(bare, 2)}`)
      // configure rejects any other member, so this default never shows
      return `Group {\n  switch model.${builder.prop} {\n  ${indent(cases.join('\n'), 2)}\n  default:\n    EmptyView()\n  }\n}`
    }
    // the columns builder: a column per item, built from data, each titled and shown
    // through the SDK's own column initializers
    const columnVersions: number[] = []
    const columnsBody = (sorted: boolean) => {
      const columns = recipe.columns!
      const initOf = (view: string, labels: string[], first: (type: string) => boolean) => {
        const found = inventory.filter(
          (d) =>
            d.kind === 'init' &&
            (d.owner === view || d.owner.endsWith(`.${view}`)) &&
            present(d) &&
            ios(d) <= ceiling &&
            d.parameters.length === labels.length &&
            d.parameters.every((p, index) => p.label === labels[index]) &&
            first(d.parameters[0].type)
        )
        if (found.length !== 1) fail(`${view} has ${found.length} initializers taking ${labels.join(', ')}`)
        columnVersions.push(ios(found[0]))
        return found[0]
      }
      // a collection of identified items, not a constant range
      initOf(columns.each, ['_', 'content'], (type) => /^\w+$/.test(type))
      const labels = sorted ? ['_', columns.sortUsing, 'content'] : ['_', 'content']
      initOf(columns.column, labels, (type) => type === 'SwiftUICore.LocalizedStringKey')
      const sort = sorted ? `, ${columns.sortUsing}: ${short}Sort(column: column.id)` : ''
      return `${columns.each}(model.decodedColumns) { column in\n  ${columns.column}(LocalizedStringKey(column.title)${sort}) { item in\n    ${indent(mountedRows, 4)}\n  }\n}`
    }
    // the chained methods an argument's converted value takes, each filled from its prop
    const chain = (initializer: Declaration, parameter: Declaration['parameters'][number], value: Argument): Argument => {
      const methods = recipe.chains?.[parameter.label]
      if (!methods) return value
      if (value.closure) fail(`${parameter.label} is a builder, which takes no chain`)
      const base = parameter.type.replace(/\?$/, '')
      const calls = Object.entries(methods).map(([method, prop]) => {
        const kind = component.props[prop] ?? fail(`chain prop ${prop} is not in the spec`)
        const found = inventory.filter(
          (d) =>
            d.kind === 'func' &&
            !d.isStatic &&
            ownerKey(d.owner) === ownerKey(base) &&
            d.name === method &&
            d.type !== undefined &&
            ownerKey(d.type) === ownerKey(base) &&
            d.parameters.length === 1 &&
            present(d)
        )
        if (found.length !== 1) fail(`${base} has ${found.length} methods ${method} returning it from one value`)
        const [declaration] = found
        if (ios(declaration) > ios(initializer))
          fail(`${base}.${method} needs iOS ${ios(declaration)}, past the call's ${ios(initializer)}`)
        const [p] = declaration.parameters
        const field = `model.${prop}`
        const type = p.type.replace(/\?$/, '')
        const passed =
          type === 'Swift.Bool' && kind.startsWith('boolean')
            ? field
            : type === 'SwiftUICore.Color' && kind.startsWith('ColorValue') && p.type.endsWith('?')
              ? `${field}.map { SwiftUICore.Color(uiColor: $0) }`
              : NUMBERS.includes(type) && kind.startsWith('Double')
                ? type === 'Swift.Double' ? field : `${type.split('.').at(-1)}(${field})`
                : fail(`${base}.${method} ${p.label}: ${p.type} cannot come from ${prop}: ${kind}`)
        return `.${method}(${p.label === '_' ? '' : `${p.label}: `}${passed})`
      })
      return { ...value, swift: `${value.swift}${calls.join('')}` }
    }
    const callFor = (without: readonly string[]): { initializer: Declaration; values: Argument[]; call: string } => {
      const initializer = initializerFor(wanted(without))
      const used = initializer.parameters.filter((p) => wanted(without).has(p.label))
      const sorted = recipe.binding !== undefined && !without.includes(recipe.binding.label)
      const values = used.map((p) => chain(initializer, p, argumentFor(p, sorted)))
      const rendered = values.map((value) => {
        const swift = value.closure
          ? `{${value.parameter ? ` ${value.parameter} in` : ''}\n  ${indent(value.swift, 2)}\n}`
          : value.swift
        return value.label === '_' ? swift : `${value.label}: ${swift}`
      })
      const optional = builder?.optional && !without.includes(builder.label)
      const call = builtCall(
        initializer,
        recipe.modifier
          ? `${recipe.surface ? 'Color.clear\n.contentShape(Rectangle())' : contentBody}\n.${recipe.modifier}(${rendered.join(', ')})`
          : `${recipe.view}(${rendered.join(', ')})`,
        optional ? callFor([...without, builder!.label]).call : undefined
      )
      const urls = values.filter((value) => value.url)
      return {
        initializer,
        values,
        call: urls.length
          ? `Group {\n  if ${urls.map((value) => `let ${value.label} = Foundation.URL(string: ${value.url})`).join(', ')} {\n    ${indent(call, 4)}\n  } else {\n    ${indent(recipe.children ? contentBody : 'EmptyView()', 4)}\n  }\n}`
          : call,
      }
    }
    // a text builder that is omitted while its prop is empty picks between two initializers
    const full = callFor([])
    if (recipe.columns && !recipe.binding) fail('columns sort through a binding')
    if (recipe.columns && component.props[recipe.columns.sortable] !== 'boolean')
      fail(`sortable prop ${recipe.columns.sortable} must be a boolean`)
    // without sort headers, the table takes no sort order
    const unsorted = recipe.columns ? callFor([recipe.binding!.label]) : undefined
    const variants = omitted.length
      ? `Group {\n  if ${omitted.map((label) => `model.${args[label]}.isEmpty`).join(' && ')} {\n    ${indent(callFor(omitted).call, 4)}\n  } else {\n    ${indent(full.call, 4)}\n  }\n}`
      : unsorted
        ? `Group {\n  if model.${recipe.columns!.sortable} {\n    ${indent(full.call, 4)}\n  } else {\n    ${indent(unsorted.call, 4)}\n  }\n}`
        : full.call
    const version = Math.max(
      ...[full, ...(omitted.length ? [callFor(omitted)] : []), ...(unsorted ? [unsorted] : [])].map(
        ({ initializer }) => ios(initializer)
      ),
      ...columnVersions
    )
    const guarded = sdkGuard(
      version,
      `  if #available(iOS ${version}, *) {\n    ${indent(variants, 4)}\n  } else {\n    EmptyView()\n  }`,
      '  EmptyView()'
    )
    const gated =
      version > floor
        ? `Group {${guarded.startsWith('\n') ? guarded : `\n${guarded}\n`}}`
        : variants
    const converted = (label: string) => {
      const value = full.values.find((v) => v.label === label)
      if (!value || value.closure)
        fail(`modifier refers to $${label}, which is not a converted argument`)
      return value!.swift
    }
    const modifiers = (recipe.modifiers ?? []).map((modifier) =>
      model(modifier.replace(/\$(\w+)/g, (_, label: string) => converted(label)))
    )

    // the handed value's members, read from the SDK. a typealias reads as its type.
    const aliased = (type: string) =>
      inventory.find((d) => d.kind === 'typealias' && d.owner === '' && d.name === ownerKey(type))
        ?.type ?? type
    const membersOf = (type: string) =>
      inventory.filter(
        (d) => ownerKey(d.owner) === ownerKey(aliased(type)) && present(d) && ios(d) <= ceiling
      )
    // a member's value as flat fields: numbers and dates as Doubles, enums as their case
    // names, geometry and structs of stored numbers as one field per part
    const flatten = (
      type: string,
      expression: string,
      prefix: string
    ): { name: string; kind: 'Double' | 'String'; assign: string }[] => {
      if (NUMBERS.includes(type))
        return [{ name: prefix, kind: 'Double', assign: `${prefix} = Double(${expression})` }]
      if (type === 'Foundation.Date')
        return [
          { name: prefix, kind: 'Double', assign: `${prefix} = ${expression}.timeIntervalSince1970 * 1000` },
        ]
      const geometry = GEOMETRY[type]
      if (geometry)
        return Object.entries(geometry).map(([part, path]) => {
          const field = fieldName(prefix, part)
          return { name: field, kind: 'Double', assign: `${field} = Double(${expression}.${path})` }
        })
      const members = membersOf(type)
      const cases = members.filter((d) => d.enumCase)
      if (cases.length) {
        const declaration = inventory.find(
          (d) => d.kind === 'enum' && ownerKey(`${d.owner}.${d.name}`) === ownerKey(type)
        )
        const frozen = declaration?.attributes.includes('@frozen') === true
        return [
          {
            name: prefix,
            kind: 'String',
            assign: `switch ${expression} {\n${cases.map((c) => `case .${c.name}: ${prefix} = ${JSON.stringify(c.name)}`).join('\n')}${frozen ? '' : `\n@unknown default: preconditionFailure("unknown ${name} ${prefix}")`}\n}`,
          },
        ]
      }
      const stored = members.filter((d) => d.kind === 'var' && d.stored && !d.isStatic)
      if (stored.length && stored.every((d) => NUMBERS.includes(d.type ?? '')))
        return stored
          .sort((a, b) => a.line - b.line)
          .flatMap((d) => flatten(d.type!, `${expression}.${d.name}`, fieldName(prefix, d.name)))
      return fail(`${type} has no flat form for React`)
    }
    // the member an expression names: a property, or a method with these labels
    const memberFor = (expression: string) => {
      const [, member, list] = /^(\w+)(?:\((.*)\))?$/.exec(expression) ?? fail(`${expression} names no member`)
      const labels = list === undefined ? undefined : list.split(',').map((a) => a.split(':')[0].trim())
      const found = membersOf(contextType).filter(
        (d) =>
          d.name === member &&
          (labels === undefined
            ? d.kind === 'var'
            : d.kind === 'func' &&
              labels.every((l) => d.parameters.some((p) => p.label === l)) &&
              d.parameters.every((p) => labels.includes(p.label) || p.defaultValue !== undefined))
      )
      if (found.length === 0) fail(`${contextType} has no ${expression}`)
      // an overload newer than the floor is left to the ones every supported iOS has
      const usable = found.filter((d) => ios(d) <= floor)
      if (usable.length === 0) fail(`${contextType}.${expression} needs an availability gate`)
      return usable
    }
    // a member read into several fields is read once
    const contextReads: string[] = []
    const contextFields = contextValues.flatMap(([prefix, expression], index) => {
      const types = new Set(memberFor(expression).map((d) => d.type!))
      if (types.size !== 1) fail(`${contextType}.${expression} returns ${[...types].join(' or ')}`)
      const fields = flatten([...types][0], `context.${expression}`, prefix)
      if (fields.length === 1) return fields
      contextReads.push(`let read${index} = context.${expression}`)
      return flatten([...types][0], `read${index}`, prefix)
    })
    if (contextValues.length) {
      const event = component.events?.[context!.event ?? ''] ?? fail(`context event ${context!.event} is not in the spec`)
      const expected = contextFields.map((f) => `${f.name}: ${f.kind === 'Double' ? 'Double' : 'string'}`)
      const declared = Object.entries(event).map(([field, type]) => `${field}: ${type}`)
      if (expected.join(', ') !== declared.join(', '))
        fail(`${context!.event} must carry ${expected.join(', ')}, not ${declared.join(', ')}`)
    }
    // the Swift name of the handed value; swiftui's own modules are imported unqualified
    const contextSwift = contextType.replace(/^(SwiftUI|SwiftUICore)\./, '')
    const contextMethods = contextCommands.map(([command, method]) => {
      const spec = Object.entries(component.commands?.[command] ?? fail(`command ${command} is not in the spec`))
      const found = membersOf(contextType).filter(
        (d) => d.kind === 'func' && d.name === method && ios(d) <= floor
      )
      if (found.length !== 1) fail(`${contextType} has ${found.length} methods named ${method}`)
      const [declaration] = found
      const hashable = new Set(
        (declaration.requirements ?? []).flatMap((r) => /^(\w+) : Swift\.Hashable$/.exec(r)?.[1] ?? [])
      )
      let next = 0
      const take = (kind: string) => {
        const [arg, type] = spec[next++] ?? fail(`${command} takes too few arguments for ${method}`)
        if (!type.startsWith(kind)) fail(`${command} ${arg} must be ${kind}, for ${method}`)
        return arg
      }
      const passed = declaration.parameters.map((parameter) => {
        const base = parameter.type.replace(/\?$/, '')
        const optional = parameter.type.endsWith('?')
        let value: string
        // a hashable id is a row's tag, which React gives as a string
        if (hashable.has(base)) value = take('string')
        else if (NUMBERS.includes(base)) value = `${base.split('.').at(-1)}(${take('Double')})`
        else if (base === 'Swift.Bool') value = take('boolean')
        else if (base === 'Swift.String') value = take('string')
        else {
          // a struct of stored numbers arrives as its parts, after a has-flag when optional
          const has = optional ? take('boolean') : ''
          const parts = membersOf(base)
            .filter((d) => d.kind === 'var' && d.stored && !d.isStatic)
            .sort((a, b) => a.line - b.line)
          if (!parts.length || parts.some((d) => !NUMBERS.includes(d.type ?? '')))
            fail(`${method} ${parameter.label}: ${parameter.type} cannot come from React`)
          const built = `${ownerKey(base)}(${parts.map((d) => `${d.name}: ${take('Double')}`).join(', ')})`
          value = optional ? `(${has} ? ${built} : nil)` : built
        }
        if (optional && !value.startsWith('(')) fail(`${method} ${parameter.label}: an optional ${base} cannot come from React`)
        return parameter.label === '_' ? value : `${parameter.label}: ${value}`
      })
      if (next !== spec.length) fail(`${command} takes more arguments than ${method}`)
      return { command, method, spec, passed }
    })
    if (contextCommands.length) modifiers.unshift('.onAppear { model.appear() }')
    const accessible = recipe.accessible !== undefined && recipe.accessible !== false
    if (accessible)
      modifiers.unshift(
        `.oneNativeAccessibility(model.accessibility${recipe.accessible === 'container' ? ', containsChildren: true' : ''})`
      )

    const action = recipe.action
    if (action && Object.keys(component.events?.[action.event] ?? {}).join(',') !== 'eventCount')
      fail(`action event ${action.event} must carry only its eventCount`)
    const binding = recipe.binding
    const bound = binding ? [binding.prop, 'acknowledgedEvent', 'revision'] : []
    for (const prop of bound) if (!(prop in component.props)) fail(`binding prop ${prop} is not in the spec`)
    const boundType = binding ? swiftField(component.props[binding.prop]) : ''
    const bindingEvent = binding
      ? (component.events?.[binding.event] ?? fail(`binding event ${binding.event} is not in the spec`))
      : {}
    const bindingField = Object.keys(bindingEvent)[0]
    if (binding && Object.keys(bindingEvent).join(',') !== `${bindingField},eventCount,revision`)
      fail(`${binding.event} must carry the value, eventCount and revision`)
    const selection = recipe.selection
    if (selection && binding) fail('a host takes a binding or a selection, not both')
    const selected = selection ? [selection.prop, selection.controlled] : []
    for (const prop of selected) if (!(prop in component.props)) fail(`selection prop ${prop} is not in the spec`)
    const environment = recipe.environment === true
    if (environment)
      for (const prop of ENVIRONMENT)
        if (!(prop in component.props)) fail(`environment prop ${prop} is not in the spec`)
    // a color reaches the model only where a chain converts it
    const chained = Object.values(recipe.chains ?? {}).flatMap((methods) => Object.values(methods))
    const props = Object.entries(component.props).filter(
      ([prop, type]) =>
        (!/ColorValue/.test(type) || chained.includes(prop)) && !(environment && ENVIRONMENT.includes(prop)) &&
        !bound.includes(prop) && !selected.includes(prop)
    )
    const leaf = recipe.layout === 'leaf'
    const measured = recipe.layout === 'measured'
    const scheme = recipe.scheme === true
    // a model starts at the SDK's default, so a recycled host never holds a value its
    // conversion rejects
    const sdkDefault = (prop: string, kind: string) => {
      const parameter = full.initializer.parameters.find((p) => args[p.label] === prop)
      const value = parameter?.defaultValue
      if (value === undefined) {
        const cases = parameter && valueOf(parameter.type)?.cases
        return kind === 'String' && cases?.length && !parameter!.type.endsWith('?')
          ? JSON.stringify(cases[0].name)
          : undefined
      }
      if (kind === 'Bool' && (value === 'true' || value === 'false')) return value
      if (kind === 'Double' && /^-?\d+(\.\d+)?$/.test(value)) return value
      if (kind === 'Double' && value === 'nil')
        return `has${upper(prop)}` in component.props ? '0' : '-1'
      if (kind === 'String' && value === 'nil')
        return component.props[prop].startsWith('string') &&
          valueOf(parameter!.type)?.kind === 'number'
          ? '"null"'
          : '""'
      if (kind === 'String' && /^\.\w+$/.test(value))
        return JSON.stringify(value.slice(1))
      const alias = Object.entries(recipe.aliases?.[prop] ?? {}).find(
        ([, swift]) => swift === value
      )
      if (kind === 'String' && alias) return JSON.stringify(alias[0])
      fail(`${prop} has the SDK default ${value}, which has no prop value`)
    }
    const fields = [
      ...props.map(([prop, type]) => {
        const kind = swiftField(type)
        const initial =
          recipe.initial?.[prop] ??
          (prop === recipe.builder?.prop ? (recipe.builder.optional ? '""' : JSON.stringify(recipe.builder.members[0])) : undefined) ??
          sdkDefault(prop, kind) ??
          (kind === 'Bool' ? 'false' : kind === 'Double' ? '0' : kind === 'UIColor?' ? 'nil' : '""')
        return { prop, kind, initial }
      }),
      ...(recipe.boundedHeight
        ? [{ prop: 'boundedHeight', kind: 'Bool', initial: 'false' }]
        : []),
    ]
    const items = recipe.items
    if (items && component.props[items.prop] !== 'string') fail(`items prop ${items.prop} must be a string`)
    const columns = recipe.columns
    if (columns && !items) fail('columns show the items')
    if (columns && component.props[columns.prop] !== 'string') fail(`columns prop ${columns.prop} must be a string`)
    const hasModel =
      fields.length > 0 || measured || binding !== undefined || selection !== undefined || context !== undefined ||
      action !== undefined || accessible
    const contentFields = [
      ...(hasModel ? [`  @ObservedObject var model: ${short}Model`] : []),
      ...(leaf ? [] : ['  @ObservedObject var children: OneNativeChildren']),
      '  @ObservedObject var style: OneNativeContainerStyle',
      ...(environment ? ['  @ObservedObject var environment: OneNativeEnvironmentModel'] : []),
      ...(leaf ? [] : ['  let standalone: Bool']),
      ...(scheme ? ['  @ObservedObject var bridge: OneNativeSchemeBridge'] : []),
    ]
    // a surface fills the stack behind the children, so the stack's modifiers lay it out first
    const styled = [
      ...(recipe.surface
        ? [`${contentBody}${modifiers.map((modifier) => `\n${modifier}`).join('')}\n.background {\n  ${indent(gated, 2)}\n}`]
        : [gated, ...modifiers]),
      `.oneNativeContainerStyle(style${recipe.skipEmptyStyle ? ', skipWhenEmpty: true' : ''})`,
    ].join('\n')
    const measuredWhen = [
      'standalone',
      ...(recipe.boundedHeight ? ['!model.boundedHeight'] : []),
      ...(recipe.measuredWhen ? [model(recipe.measuredWhen)] : []),
    ].join(' && ')
    const body = [
      (items ? 'let mounted = model.mounted(children.items)\n    ' : '') +
        indent(environment ? `OneNativeEnvironment(model: environment, content: ${styled})` : styled, 4),
      ...(measured ? [`    .oneNativeMeasured(${measuredWhen}, model.onHeight)`] : []),
      ...(scheme ? ['    .oneNativeScheme(standalone, bridge.scheme)'] : []),
    ]
    const contentArguments = [
      ...(hasModel ? ['model: model'] : []),
      ...(leaf ? [] : ['children: children']),
      'style: style',
      ...(environment ? ['environment: environment'] : []),
      ...(leaf ? [] : ['standalone: standalone']),
      ...(scheme ? ['bridge: bridge'] : []),
    ].join(', ')
    const initialBound = binding
      ? (recipe.initial?.[binding.prop] ?? (boundType === 'Bool' ? 'false' : boundType === 'Double' ? '0' : '""'))
      : ''
    const configured = fields
    const swift = `${header}import SwiftUI
import UIKit
${
  items
    ? `
// an item of the ${items.prop} React sends as JSON${items.children ? ', nil children for a leaf' : ''}
private struct ${short}Item: Identifiable, Decodable {
  let id: String${items.children ? `\n  let children: [${short}Item]?` : ''}
}
`
    : ''
}${
  columns
    ? `
// a column of the ${columns.prop} React sends as JSON
private struct ${short}ColumnData: Identifiable, Decodable {
  let id: String
  let title: String
}

// the sorted column as React sends it, empty while none is
private struct ${short}SortValue: Codable {
  let column: String
  let ascending: Bool
}

// a header the user tapped. the rows stay in the order React sends them, so comparing
// never reorders
private struct ${short}Sort: SortComparator, Hashable {
  var column: String
  var order: SortOrder = .forward

  func compare(_ lhs: ${short}Item, _ rhs: ${short}Item) -> ComparisonResult { .orderedSame }
}
`
    : ''
}${
  hasModel
    ? `
private final class ${short}Model: ObservableObject {
${[
  ...(binding ? [`  @Published var controlled = OneNativeControlled<${boundType}>(${initialBound})`] : []),
  ...fields.map(({ prop, kind, initial }) => `  @Published var ${prop}: ${kind} = ${initial}`),
  ...(measured ? ['  var onHeight: ((CGFloat) -> Void)?'] : []),
  ...(presented
    ? [
        '  @Published var content: UIView?',
        '  var onLayout: ((CGRect) -> Void)?',
        '  // the laid-out presented content size, reported back from the bridge.',
        '  // sizing to content reads it as the ideal size.',
        '  @Published var measuredWidth: CGFloat = 0',
        '  @Published var measuredHeight: CGFloat = 0',
        '',
        '  func setMeasuredSize(_ size: CGSize) {',
        '    guard size.width.isFinite, size.height.isFinite, size.width > 0, size.height > 0,',
        '      abs(measuredWidth - size.width) >= 0.5 || abs(measuredHeight - size.height) >= 0.5 else { return }',
        '    measuredWidth = size.width',
        '    measuredHeight = size.height',
        '  }',
      ]
    : []),
  ...(items
    ? [
        `  @Published var items: [${short}Item] = []`,
        ...(columns ? [`  @Published var decodedColumns: [${short}ColumnData] = []`] : []),
        `  var slots: [ObjectIdentifier: ${items.slot}View] = [:]`,
        '',
        '  // the mounted rows by their keys, found once per body rather than per item',
        '  func mounted(_ children: [OneNativeComposedChild]) -> [[String]: [OneNativeComposedChild]] {',
        '    var found: [[String]: [OneNativeComposedChild]] = [:]',
        '    for child in children {',
        '      guard let row = slots[child.sourceID] else { continue }',
        `      found[[${slotKeys.map((key) => `row.${key}`).join(', ')}], default: []].append(child)`,
        '    }',
        '    return found',
        '  }',
      ]
    : []),
  ...(accessible ? ['  @Published var accessibility = OneNativeAccessibility()'] : []),
  ...(binding || selection || action || contextValues.length ? ['  var active = false'] : []),
  ...(action
    ? [
        '  var onAction: ((Int) -> Void)?',
        '  private var actionCount = 0',
        '',
        '  func action() {',
        '    guard active else { return }',
        '    actionCount += 1',
        '    onAction?(actionCount)',
        '  }',
      ]
    : []),
  ...(contextValues.length
    ? [
        `  var latest: ${short}Context?`,
        `  var onContext: ((${short}Context) -> Void)?`,
        '',
        '  // the builder runs inside SwiftUI\'s update, so React hears of a change after it',
        `  func read(_ next: ${short}Context) {`,
        '    guard next != latest else { return }',
        '    latest = next',
        '    DispatchQueue.main.async { [weak self] in',
        '      guard let self, self.active, self.latest == next else { return }',
        '      self.onContext?(next)',
        '    }',
        '  }',
      ]
    : []),
  ...(contextCommands.length
    ? [
        `  private var context: ${contextSwift}?`,
        '  private var appeared = false',
        `  private var pending: [(${contextSwift}) -> Void] = []`,
        '',
        '  // the builder only stores the value, since SwiftUI hands it out during the build',
        `  func capture(_ context: ${contextSwift}) { self.context = context }`,
        '',
        '  func appear() {',
        '    appeared = true',
        `    guard let context else { preconditionFailure("${name} appeared before its builder ran") }`,
        '    let queued = pending',
        '    pending = []',
        '    for run in queued { run(context) }',
        '  }',
        '',
        '  // a call before the content first appears waits for it, so none is dropped',
        `  func run(_ body: @escaping (${contextSwift}) -> Void) {`,
        '    guard appeared, let context else {',
        '      pending.append(body)',
        '      return',
        '    }',
        '    body(context)',
        '  }',
        '',
        '  func resetContext() {',
        '    context = nil',
        '    appeared = false',
        '    pending = []',
        '  }',
      ]
    : []),
  ...(binding
    ? [
        `  var onChange: ((${boundType}, Int, Int) -> Void)?`,
        '',
        `  func change(_ value: ${boundType}) {`,
        '    guard active, controlled.value != value else { return }',
        '    controlled.change(value)',
        '    onChange?(value, controlled.eventCount, controlled.revision)',
        '  }',
      ]
    : []),
  ...(columns
    ? [
        '',
        `  var sortOrder: Binding<[${short}Sort]> {`,
        '    Binding(',
        '      get: { [self] in',
        '        guard !controlled.value.isEmpty else { return [] }',
        `        let sort: ${short}SortValue`,
        `        do { sort = try JSONDecoder().decode(${short}SortValue.self, from: Data(controlled.value.utf8)) }`,
        `        catch { preconditionFailure("invalid ${name} ${binding!.prop} \\(controlled.value): \\(error)") }`,
        `        return [${short}Sort(column: sort.column, order: sort.ascending ? .forward : .reverse)]`,
        '      },',
        '      set: { [self] next in',
        '        guard let first = next.first else { return }',
        `        let sort = ${short}SortValue(column: first.column, ascending: first.order == .forward)`,
        '        do { change(String(decoding: try JSONEncoder().encode(sort), as: UTF8.self)) }',
        `        catch { preconditionFailure("invalid ${name} ${binding!.prop}: \\(error)") }`,
        '      }',
        '    )',
        '  }',
      ]
    : []),
  ...(selection
    ? [
        '  @Published var selectedTags = Set<String>()',
        '  @Published var uncontrolledSelection = Set<String>()',
        '  @Published var selectionIsControlled = false',
        '  var onSelectionChange: ((String) -> Void)?',
        '',
        '  var currentSelection: Set<String> {',
        '    selectionIsControlled ? selectedTags : uncontrolledSelection',
        '  }',
        '',
        '  var selectionBinding: Binding<Set<String>> {',
        '    Binding(',
        '      get: { [self] in currentSelection },',
        '      set: { [self] next in',
        '        guard next != currentSelection else { return }',
        '        if !selectionIsControlled { uncontrolledSelection = next }',
        '        guard active else { return }',
        '        do {',
        '          let data = try JSONEncoder().encode(next.sorted())',
        '          onSelectionChange?(String(decoding: data, as: UTF8.self))',
        '        } catch {',
        `          preconditionFailure("invalid ${name} selection: \\(error)")`,
        '        }',
        '      }',
        '    )',
        '  }',
        '',
        '  func configureSelection(_ json: String, controlled: Bool) {',
        '    let next: [String]',
        '    do { next = try JSONDecoder().decode([String].self, from: Data(json.utf8)) }',
        `    catch { preconditionFailure("invalid ${name} selection \\(json): \\(error)") }`,
        '    if controlled { selectedTags = Set(next) }',
        '    selectionIsControlled = controlled',
        '  }',
      ]
    : []),
].join('\n')}
}
`
    : ''
}${
  contextValues.length
    ? `
// what React reads of the ${contextSwift} SwiftUI hands the content builder
private struct ${short}Context: Equatable {
${contextFields.map((f) => `  let ${f.name}: ${f.kind}`).join('\n')}

  init(_ context: ${contextSwift}) {
    ${indent([...contextReads, ...contextFields.map((f) => f.assign)].join('\n'), 4)}
  }
}
`
    : ''
}
private struct ${short}Content: View {
${contentFields.join('\n')}

  var body: some View {
    ${body.join('\n')}
  }
}
${conversions.length ? `\n${conversions.join('\n\n')}\n` : ''}
@objcMembers
public final class ${name}View: ${leaf ? 'OneNativeStyledLeafView' : 'OneNativeContainerView'} {
${[
  ...(binding ? [`  public var onChange: ((${boundType}, Int, Int) -> Void)?`] : []),
  ...(selection ? ['  public var onSelectionChange: ((String) -> Void)?'] : []),
  ...(action ? ['  public var onAction: ((Int) -> Void)?'] : []),
  ...(measured ? ['  public var onMeasure: ((CGFloat) -> Void)?'] : []),
  ...(contextValues.length
    ? [`  public var onContext: ((${contextFields.map((f) => f.kind).join(', ')}) -> Void)?`]
    : []),
  ...(hasModel ? [`  private let model: ${short}Model`] : []),
  ...(environment ? ['  private let environment: OneNativeEnvironmentModel'] : []),
  ...(scheme
    ? [
        '  private let bridge: OneNativeSchemeBridge',
        '  private var traitRegistration: NSObjectProtocol?',
      ]
    : []),
].join('\n')}

  public init() {
${[
  ...(hasModel ? [`    let model = ${short}Model()`, '    self.model = model'] : []),
  ...(environment
    ? ['    let environment = OneNativeEnvironmentModel()', '    self.environment = environment']
    : []),
  ...(scheme
    ? ['    let bridge = OneNativeSchemeBridge()', '    self.bridge = bridge']
    : []),
].join('\n')}
    super.init(styled: { ${leaf ? 'style' : 'children, style, standalone'} in
      AnyView(${short}Content(${contentArguments}))
    })${selection ? '\n    model.onSelectionChange = { [weak self] selection in\n      self?.onSelectionChange?(selection)\n    }' : ''}${binding ? '\n    model.onChange = { [weak self] value, count, revision in\n      self?.onChange?(value, count, revision)\n    }' : ''}${action ? '\n    model.onAction = { [weak self] count in self?.onAction?(count) }' : ''}${measured ? '\n    model.onHeight = { [weak self] height in self?.onMeasure?(height) }' : ''}${
      contextValues.length
        ? `\n    model.onContext = { [weak self] context in\n      self?.onContext?(${contextFields.map((f) => `context.${f.name}`).join(', ')})\n    }`
        : ''
    }${
      scheme
        ? `
    traitRegistration = registerForTraitChanges([UITraitUserInterfaceStyle.self]) {
      [weak bridge] (view: ${name}View, _: UITraitCollection) in
      bridge?.sync(view.traitCollection)
    }`
        : ''
    }
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) is unavailable") }
${
  scheme
    ? `
  public override func didMoveToWindow() {
    bridge.sync(traitCollection)
    super.didMoveToWindow()
  }
`
    : ''
}${
      configured.length || binding || selection
        ? `
  public func configure(${[
    ...(binding ? [`${binding.prop}: ${boundType}`, 'acknowledgedEvent: Int', 'revision: Int'] : []),
    ...configured.map(({ prop, kind }) => `${prop}: ${kind}`),
    ...(selection ? [`${selection.prop}: String`, `${selection.controlled}: Bool`] : []),
  ].join(', ')}) {
${[
  ...(recipe.builder
    ? [
        `    precondition([${[...(recipe.builder.optional ? [''] : []), ...recipe.builder.members].map((m) => JSON.stringify(m)).join(', ')}].contains(${recipe.builder.prop}), "invalid ${name} ${recipe.builder.prop}: \\(${recipe.builder.prop})")`,
      ]
    : []),
  ...(binding
    ? [
        `    if let next = model.controlled.applying(${binding.prop}, acknowledged: acknowledgedEvent, revision: revision) { model.controlled = next }`,
      ]
    : []),
 ...configured.map(({ prop }) =>
    prop === items?.prop
      ? `    if model.${prop} != ${prop} {
      do { model.items = try JSONDecoder().decode([${short}Item].self, from: Data(${prop}.utf8)) }
      catch { preconditionFailure("invalid ${name} ${prop} \\(${prop}): \\(error)") }
      model.${prop} = ${prop}
    }`
      : prop === columns?.prop
        ? `    if model.${prop} != ${prop} {
      do { model.decodedColumns = try JSONDecoder().decode([${short}ColumnData].self, from: Data(${prop}.utf8)) }
      catch { preconditionFailure("invalid ${name} ${prop} \\(${prop}): \\(error)") }
      model.${prop} = ${prop}
    }`
        : `    if model.${prop} != ${prop} { model.${prop} = ${prop} }`
  ),
  ...(selection ? [`    model.configureSelection(${selection.prop}, controlled: ${selection.controlled})`] : []),
].join('\n')}
  }
${binding || selection ? '\n  public override func setActive(_ active: Bool) { model.active = active }\n' : ''}`
        : ''
    }${
      action && !(binding || selection)
        ? '\n  public override func setActive(_ active: Bool) { model.active = active }\n'
        : ''
    }${
      accessible
        ? `
  public func configureAccessibility(_ label: String, hint: String, value: String, identifier: String) {
    let next = OneNativeAccessibility(label: label, hint: hint, value: value, identifier: identifier)
    if model.accessibility != next { model.accessibility = next }
  }
`
        : ''
    }${
      contextValues.length
        ? `
  public override func setActive(_ active: Bool) {
    model.active = active
    if active, let latest = model.latest { model.onContext?(latest) }
  }
`
        : ''
    }${contextMethods
      .map(
        ({ command, spec, method, passed }) => `
  public func ${command}(${spec.map(([arg, type], index) => `${index === 0 ? '_ ' : ''}${arg}: ${swiftField(type)}`).join(', ')}) {
    model.run { context in context.${method}(${passed.join(', ')}) }
  }
`
      )
      .join('')}${
      environment
        ? `
  public func configureEnvironment(
    colorScheme: String, dynamicTypeSize: String, controlSize: String, locale: String,
    tint: UIColor?, isEnabled: String
  ) {
    environment.configure(
      colorScheme: colorScheme, dynamicTypeSize: dynamicTypeSize, controlSize: controlSize,
      locale: locale, tint: tint, isEnabled: isEnabled)
  }
`
        : ''
    }${
      presented
        ? `
  public func mountContent(_ view: UIView, onLayout: @escaping (CGRect) -> Void) {
    model.onLayout = onLayout
    model.content = view
  }

  public func unmountContent(_ view: UIView) {
    model.onLayout = nil
    if model.content === view { model.content = nil }
    model.measuredWidth = 0
    model.measuredHeight = 0
    view.removeFromSuperview()
  }

  public func setMeasuredSize(_ size: CGSize) { model.setMeasuredSize(size) }
`
        : ''
    }${
      items
        ? `
  public override func insertChild(_ child: UIView, at index: Int) {
    guard let row = child as? ${items.slot}View else {
      preconditionFailure("${name} rows are made by its own render function")
    }
    model.slots[ObjectIdentifier(row)] = row
    super.insertChild(child, at: index)
  }

  public override func removeChild(_ child: UIView) {
    model.slots.removeValue(forKey: ObjectIdentifier(child))
    super.removeChild(child)
  }
`
        : ''
    }${
      recipe.rowModifiers
        ? `
  @nonobjc override func isRowModifier(_ name: String) -> Bool {
    ${recipe.rowModifiers}
  }
`
        : ''
    }${
      (hasModel && fields.length) || environment || binding || selection || context || accessible
        ? `
  public override func reset() {
${[
  ...(binding ? ['    model.active = false', `    model.controlled = OneNativeControlled<${boundType}>(${initialBound})`] : []),
  ...(presented
    ? [
        '    model.content?.removeFromSuperview()',
        '    model.content = nil',
        '    model.onLayout = nil',
        '    model.measuredWidth = 0',
        '    model.measuredHeight = 0',
      ]
    : []),
  ...fields.map(({ prop, initial }) => `    model.${prop} = ${initial}`),
  ...(accessible ? ['    model.accessibility = OneNativeAccessibility()'] : []),
  ...(selection
    ? ['    model.selectedTags = []', '    model.uncontrolledSelection = []', '    model.selectionIsControlled = false']
    : []),
  ...(environment ? ['    environment.reset()'] : []),
  ...(contextValues.length ? ['    model.latest = nil'] : []),
  ...(items ? ['    model.items = []', '    model.slots = [:]'] : []),
  ...(columns ? ['    model.decodedColumns = []'] : []),
  ...(contextCommands.length ? ['    model.resetContext()'] : []),
].join('\n')}
    super.reset()
  }
`
        : ''
    }}
`

    outputs.set(`ios/Generated/${name}View.swift`, swift)
    const base = leaf
      ? 'RCTViewComponentView'
      : measured
        ? 'OneNativeMeasuredComponentView'
        : 'OneNativeContainerComponentView'
    const baseImport = leaf
      ? '<React/RCTViewComponentView.h>'
      : `"${measured ? 'OneNativeMeasuredComponentView' : 'OneNativeContainerComponentView'}.h"`
    outputs.set(
      `ios/Generated/${name}ComponentView.h`,
      `${header}#ifdef __cplusplus
#import ${baseImport}
@interface ${name}ComponentView : ${base}
@end
#endif
`
    )
    const objcConfigured = [
      ...bound.map((prop) => ({ prop, value: objcArgument(prop, component.props[prop]) })),
      ...configured.map(({ prop }) => ({
        prop,
        value: prop === 'boundedHeight' ? 'boundedHeight' : objcArgument(prop, component.props[prop]),
      })),
      ...(selection
        ? [
            { prop: selection.prop, value: `RCTNSStringFromString(next.${selection.prop})` },
            { prop: selection.controlled, value: `next.${selection.controlled}` },
          ]
        : []),
    ]
    const configure = objcConfigured.length
      ? `  [_nativeView configureWith${upper(objcConfigured[0].prop)}:${objcConfigured
          .map(({ prop, value }, index) => (index === 0 ? value : `\n      ${prop}:${value}`))
          .join('')}];\n`
      : ''
    const configureEnvironment = environment
      ? `  [_nativeView configureEnvironmentWithColorScheme:RCTNSStringFromString(next.colorScheme)
      dynamicTypeSize:RCTNSStringFromString(next.dynamicTypeSize)
      controlSize:RCTNSStringFromString(next.controlSize)
      locale:RCTNSStringFromString(next.locale)
      tint:next.tint ? RCTUIColorFromSharedColor(next.tint) : nil
      isEnabled:RCTNSStringFromString(next.isEnabled)];\n`
      : ''
    outputs.set(
      `ios/Generated/${name}ComponentView.mm`,
      `${header}#import "${name}ComponentView.h"
#import <React/RCTView.h>
#import "One-Swift.h"
#import "OneNativeContainerStyle.h"
${measured ? `#import "${name}ShadowNode.h"` : '#import <react/renderer/components/OneNativeSpec/ComponentDescriptors.h>'}
#import <React/RCTConversions.h>${contextMethods.length ? '\n#import <react/renderer/components/OneNativeSpec/RCTComponentViewHelpers.h>' : ''}${presented ? `\n#import "${presented.slot}ComponentView.h"` : ''}

using namespace facebook::react;
${contextMethods.length ? `\n@interface ${name}ComponentView () <RCT${name}ViewProtocol>\n@end\n` : ''}
@implementation ${name}ComponentView {
  ${name}View *_nativeView;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<${name}ComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const ${name}Props>();
    _nativeView = [${name}View new];
${
  leaf
    ? `    __weak ${name}ComponentView *weakSelf = self;
    _nativeView.onSwiftStyleEvent = ^(NSString *name, NSString *value) {
      ${name}ComponentView *strongSelf = weakSelf;
      if (!strongSelf || !strongSelf->_eventEmitter) return;
      auto emitter = std::static_pointer_cast<const ${name}EventEmitter>(strongSelf->_eventEmitter);
      emitter->onNativeSDKEvent({.name = std::string(name.UTF8String), .value = std::string(value.UTF8String)});
    };
`
    : `    self.container = _nativeView;
    OneNativeForwardSwiftStyleEvents<${name}EventEmitter>(self);
`
}    self.contentView = _nativeView;
${
  selection
    ? `    __weak ${name}ComponentView *weakSelected = self;
    _nativeView.onSelectionChange = ^(NSString *selection) {
      ${name}ComponentView *strongSelf = weakSelected;
      if (!strongSelf || !strongSelf->_eventEmitter) return;
      auto emitter = std::static_pointer_cast<const ${name}EventEmitter>(strongSelf->_eventEmitter);
      emitter->${selection.event}({.${selection.prop} = std::string(selection.UTF8String)});
    };
`
    : ''
}${
  binding
    ? `    __weak ${name}ComponentView *weakChanged = self;
    _nativeView.onChange = ^(${boundType === 'Bool' ? 'BOOL' : boundType === 'Double' ? 'double' : 'NSString *'} value, NSInteger eventCount, NSInteger revision) {
      ${name}ComponentView *strongSelf = weakChanged;
      if (!strongSelf || !strongSelf->_eventEmitter) return;
      auto emitter = std::static_pointer_cast<const ${name}EventEmitter>(strongSelf->_eventEmitter);
      emitter->${binding.event}({.${bindingField} = ${boundType === 'Bool' ? '(bool)value' : boundType === 'Double' ? 'value' : 'std::string(value.UTF8String)'}, .eventCount = (int)eventCount, .revision = (int)revision});
    };
`
    : ''
}${
  contextValues.length
    ? `    __weak ${name}ComponentView *weakContext = self;
    _nativeView.onContext = ^(${contextFields.map((f) => `${f.kind === 'Double' ? 'double ' : 'NSString *'}${f.name}`).join(', ')}) {
      ${name}ComponentView *strongSelf = weakContext;
      if (!strongSelf || !strongSelf->_eventEmitter) return;
      auto emitter = std::static_pointer_cast<const ${name}EventEmitter>(strongSelf->_eventEmitter);
      emitter->${context!.event}({${contextFields.map((f) => `.${f.name} = ${f.kind === 'Double' ? f.name : `std::string(${f.name}.UTF8String)`}`).join(', ')}});
    };
`
    : ''
}${
  action
    ? `    __weak ${name}ComponentView *weakActed = self;
    _nativeView.onAction = ^(NSInteger eventCount) {
      ${name}ComponentView *strongSelf = weakActed;
      if (!strongSelf || !strongSelf->_eventEmitter) return;
      auto emitter = std::static_pointer_cast<const ${name}EventEmitter>(strongSelf->_eventEmitter);
      emitter->${action.event}({.eventCount = (int)eventCount});
    };
`
    : ''
}${
  measured
    ? `    __weak ${name}ComponentView *weakSelf = self;
    _nativeView.onMeasure = ^(CGFloat height) {
      [weakSelf updateMeasuredHeight:height];
    };
`
    : ''
}  }
  return self;
}
${
  presented
    ? `
// the children compose as any container's do; the presented slot leaves the surface
- (void)mountChildComponentView:(UIView<RCTComponentViewProtocol> *)child index:(NSInteger)index {
  if (![child isKindOfClass:${presented.slot}ComponentView.class]) {
    [super mountChildComponentView:child index:index];
    return;
  }
  __weak ${presented.slot}ComponentView *weakContent = (${presented.slot}ComponentView *)child;
  __weak ${name}View *weakNativeView = _nativeView;
  [(${presented.slot}ComponentView *)child setMeasuredSizeCallback:^(CGSize size) { [weakNativeView setMeasuredSize:size]; }];
  [_nativeView mountContent:child onLayout:^(CGRect frame) { [weakContent updateNativeFrame:frame]; }];
}

- (void)unmountChildComponentView:(UIView<RCTComponentViewProtocol> *)child index:(NSInteger)index {
  if (![child isKindOfClass:${presented.slot}ComponentView.class]) {
    [super unmountChildComponentView:child index:index];
    return;
  }
  [(${presented.slot}ComponentView *)child setMeasuredSizeCallback:nil];
  [_nativeView unmountContent:child];
}
`
    : ''
}
- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
  const auto &next = *std::static_pointer_cast<const ${name}Props>(props);
${
  accessible
    ? `  [_nativeView configureAccessibility:RCTNSStringFromString(next.accessibilityLabel)
    hint:RCTNSStringFromString(next.accessibilityHint)
    value:RCTNSStringFromString(next.accessibilityValue.text.value_or(""))
    identifier:RCTNSStringFromString(next.testId)];
`
    : ''
}  [_nativeView configureSwiftStyle:OneNativeStyleDictionary(next.swiftStyle)];
${
  recipe.boundedHeight
    ? `  const auto height = next.yogaStyle.dimension(facebook::yoga::Dimension::Height);
  const bool boundedHeight = !height.isUndefined() && !height.isAuto();
`
    : ''
}${configure}${configureEnvironment}  [super updateProps:props oldProps:oldProps];${
  accessible
    ? `
  // the swiftui view carries testID (OneNativeAccessibility); the host also carrying it gives
  // tests a second match whose centre can miss the view
  self.accessibilityIdentifier = nil;`
    : ''
}
}
${contextMethods
  .map(
    ({ command, spec }) => `
- (void)${command}${spec.map(([arg, type], index) => `${index === 0 ? '' : ` ${arg}`}:(${objcType(type)})${arg}`).join('')} {
  [_nativeView ${command}${spec.map(([arg], index) => `${index === 0 ? '' : ` ${arg}`}:${arg}`).join('')}];
}
`
  )
  .join('')}${
  contextMethods.length
    ? `
- (void)handleCommand:(const NSString *)commandName args:(const NSArray *)args {
  RCT${name}HandleCommand(self, commandName, args);
}
`
    : ''
}${
  leaf
    ? `
- (void)prepareForRecycle {
  [super prepareForRecycle];
  [_nativeView reset];
}
`
    : ''
}
@end
`
    )
    if (measured) {
      outputs.set(
        `cpp/${name}ShadowNode.h`,
        `${header}#pragma once
#ifdef __cplusplus
#include <react/renderer/components/OneNativeSpec/EventEmitters.h>
#include <react/renderer/components/OneNativeSpec/Props.h>
#include "OneNativeMeasuredShadowNode.h"
namespace facebook::react {
extern const char ${name}ComponentName[];
using ${name}ShadowNode = OneNativeMeasuredShadowNode<${name}ComponentName, ${name}Props, ${name}EventEmitter>;
using ${name}ComponentDescriptor = OneNativeMeasuredComponentDescriptor<${name}ShadowNode>;
}
#endif
`
      )
      outputs.set(
        `cpp/${name}ShadowNode.cpp`,
        `${header}#include "${name}ShadowNode.h"

namespace facebook::react {
extern const char ${name}ComponentName[] = "${name}";
}
`
      )
    }
  }
  return hosted.map((component) => component.name)
}
