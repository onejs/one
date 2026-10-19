import { navigationHost } from './catalog'
import { containerComponents, contentComponents } from './emitContainers'
import {
  ios,
  present,
  selectConstructor,
  selectModifier,
  type Declaration,
} from './inventory'

type NavSpec = {
  name: string
  props: Record<string, string>
  events: Record<string, Record<string, string>>
  swiftStyle?: boolean
}

const rows = () =>
  [...containerComponents, ...contentComponents] as unknown as readonly NavSpec[]

const sdkEvent = { name: 'string', value: 'string' }

// the SDK facts the navigation hosts emit against: the root-only stack
// initializer, the ToolbarContent toolbar modifier, and the four toolbar entry
// initializers, plus the exact spec surface each host fills. the spacer gate
// version is read from its declaration. anything missing, reshaped, or newer
// than the floor fails instead of emitting stale calls; the hosts carry no
// other availability gates.
export function validateNavigationHost(
  inventory: readonly Declaration[],
  floor: number,
  ceiling: number,
  menu: readonly NavSpec[] = rows()
) {
  const fail = (message: string): never => {
    throw new Error(`OneNativeNavigationStack host: ${message}`)
  }
  const row = (name: string) =>
    menu.find((entry) => entry.name === name) ?? fail(`components name no ${name}`)
  const stack = selectConstructor(inventory, navigationHost.stack)
  if (ios(stack) > floor)
    fail(`NavigationStack(root:) needs iOS ${ios(stack)}, past the floor ${floor}`)
  const toolbar = selectModifier(inventory, navigationHost.toolbar)
  if (ios(toolbar) > floor)
    fail(`toolbar(content:) needs iOS ${ios(toolbar)}, past the floor ${floor}`)
  for (const entry of navigationHost.entries) {
    const declaration = selectConstructor(inventory, entry)
    if (!('gated' in entry) && ios(declaration) > floor)
      fail(
        `${entry.type} needs iOS ${ios(declaration)}, past the floor ${floor}`
      )
    if ('gated' in entry && ios(declaration) > ceiling)
      fail(
        `${entry.type} needs iOS ${ios(declaration)}, past the ceiling ${ceiling}`
      )
  }
  const stackRow = row('OneNativeNavigationStack')
  if (Object.keys(stackRow.props).length !== 0) fail('OneNativeNavigationStack takes no props')
  if (JSON.stringify(stackRow.events.onNativeSDKEvent ?? null) !== JSON.stringify(sdkEvent))
    fail('OneNativeNavigationStack must carry the SDK event')
  if (stackRow.swiftStyle !== true) fail('OneNativeNavigationStack styles through swiftStyle')
  const contentRow = row('OneNativeNavigationStackContent')
  if (Object.keys(contentRow.props).length !== 0 || Object.keys(contentRow.events).length !== 0)
    fail('OneNativeNavigationStackContent carries no props or events')
  const toolbarRow = row('OneNativeToolbar')
  if (Object.keys(toolbarRow.props).length !== 0 || Object.keys(toolbarRow.events).length !== 0)
    fail('OneNativeToolbar carries no props or events')
  for (const marker of navigationHost.markers) {
    const markerRow = row(marker.component)
    for (const arg of marker.args) {
      if ('fixed' in arg) continue
      if (!(arg.prop in markerRow.props))
        fail(`configure prop ${arg.prop} is not in the ${marker.component} spec`)
      if (markerRow.props[arg.prop] !== arg.type)
        fail(
          `configure prop ${arg.prop} carries ${markerRow.props[arg.prop]}, not the ${arg.type} the marker reads`
        )
    }
    if (marker.style !== (markerRow.swiftStyle === true))
      fail(`${marker.component} styles ${marker.style ? 'through swiftStyle' : 'nowhere'}`)
    const reports = 'onNativeSDKEvent' in markerRow.events
    if (marker.sdkEvent !== reports)
      fail(`${marker.component} reports SDK events ${marker.sdkEvent ? 'up' : 'nowhere'}`)
    if (reports && JSON.stringify(markerRow.events.onNativeSDKEvent) !== JSON.stringify(sdkEvent))
      fail(`${marker.component} must carry the SDK event`)
  }
}

// the SDK facts the split hosts emit against: the four columnVisibility
// initializers, the visibility and compact-column members converted both ways,
// and the exact spec surface of the split and its column. the compact gate
// version is read from its initializers; the column members must already exist
// there. anything missing, reshaped, or newer than its gate fails instead of
// emitting stale calls.
export function validateNavigationSplitHost(
  inventory: readonly Declaration[],
  floor: number,
  ceiling: number,
  menu: readonly NavSpec[] = rows()
) {
  const fail = (message: string): never => {
    throw new Error(`OneNativeNavigationSplitView host: ${message}`)
  }
  const row = (name: string) =>
    menu.find((entry) => entry.name === name) ?? fail(`components name no ${name}`)
  const gated: number[] = []
  for (const initializer of navigationHost.split.initializers) {
    const declaration = selectConstructor(inventory, {
      type: 'NavigationSplitView',
      parameters: initializer.parameters,
    })
    if (!initializer.gated && ios(declaration) > floor)
      fail(
        `NavigationSplitView needs iOS ${ios(declaration)}, past the floor ${floor}`
      )
    if (initializer.gated) {
      if (ios(declaration) > ceiling)
        fail(
          `NavigationSplitView needs iOS ${ios(declaration)}, past the ceiling ${ceiling}`
        )
      gated.push(ios(declaration))
    }
  }
  if (new Set(gated).size !== 1) fail('the compact initializers ship different versions')
  for (const table of [navigationHost.split.visibility, navigationHost.split.compactColumn]) {
    if (!(table.members as readonly string[]).includes(table.default))
      fail(`${table.type} names no ${table.default} fallback`)
    for (const member of table.members) {
      const matches = inventory.filter(
        (declaration) =>
          declaration.kind === 'static' &&
          (declaration.owner === table.type || declaration.owner === `SwiftUI.${table.type}`) &&
          declaration.name === member &&
          declaration.parameters.length === 0 &&
          declaration.type === `SwiftUI.${table.type}` &&
          present(declaration) &&
          ios(declaration) <= ceiling
      )
      if (matches.length !== 1)
        fail(`${table.type} has ${matches.length} members spelling .${member}`)
      const latest = table === navigationHost.split.visibility ? floor : gated[0]
      if (ios(matches[0]) > latest)
        fail(`${table.type}.${member} needs iOS ${ios(matches[0])}, past ${latest}`)
    }
  }
  const split = row('OneNativeNavigationSplitView')
  for (const { prop, type } of navigationHost.split.configure) {
    if (!(prop in split.props)) fail(`configure prop ${prop} is not in the spec`)
    if (split.props[prop] !== type)
      fail(`configure prop ${prop} carries ${split.props[prop]}, not the ${type} the model reads`)
  }
  if (split.swiftStyle !== true) fail('OneNativeNavigationSplitView styles through swiftStyle')
  const splitEvents: Record<string, Record<string, string>> = {
    onNativeNavigationSplitViewColumnVisibilityChange: { visibility: 'string' },
    onNativeNavigationSplitViewPreferredCompactColumnChange: { column: 'string' },
    onNativeSDKEvent: { name: 'string', value: 'string' },
  }
  for (const [event, fields] of Object.entries(splitEvents)) {
    const declared = split.events[event] ?? fail(`event ${event} is not in the spec`)
    if (JSON.stringify(declared) !== JSON.stringify(fields))
      fail(`${event} must carry ${Object.keys(fields).join(', ')}`)
  }
  const column = row(navigationHost.split.column.component)
  const { prop, type } = navigationHost.split.column.column
  if (!(prop in column.props)) fail(`configure prop ${prop} is not in the spec`)
  if (column.props[prop] !== type)
    fail(`configure prop ${prop} carries ${column.props[prop]}, not the ${type} the column reads`)
  if (column.swiftStyle !== true)
    fail(`${navigationHost.split.column.component} styles through swiftStyle`)
  if (JSON.stringify(column.events.onNativeSDKEvent ?? null) !== JSON.stringify(sdkEvent))
    fail(`${navigationHost.split.column.component} must carry the SDK event`)
}

export function emitNavigationHost(
  header: string,
  outputs: Map<string, string>,
  inventory: readonly Declaration[],
  floor: number,
  ceiling: number
) {
  validateNavigationHost(inventory, floor, ceiling)
  validateNavigationSplitHost(inventory, floor, ceiling)
  const spacer = selectConstructor(
    inventory,
    navigationHost.entries.find((entry) => entry.kind === 'spacer')!
  )
  // the sender rejects spacers below iOS 26, and the branch only compiles where
  // the SDK declares the type, so the gate follows the SDK past the floor.
  const spacerGate = ios(spacer) > floor
  const spacerVersion = Number.isInteger(ios(spacer)) ? `${ios(spacer)}.0` : `${ios(spacer)}`
  const spacerBranch = spacerGate
    ? `      // ToolbarSpacer is iOS ${spacerVersion} API and React rejects it below that, so this branch only\n      // ever runs where the SDK declares the type.\n      if #available(iOS ${spacerVersion}, *) {\n        ToolbarSpacer(\n          OneNativeGenerated.spacerSizing(entry.sizing),\n          placement: OneNativeGenerated.toolbarItemPlacement(entry.placement))\n      }`
    : `      ToolbarSpacer(\n        OneNativeGenerated.spacerSizing(entry.sizing),\n        placement: OneNativeGenerated.toolbarItemPlacement(entry.placement))`
  outputs.set(
    'ios/Generated/OneNativeNavigationStackView.swift',
    header +
      `import SwiftUI
import UIKit

// a container that owns a bar: a Toolbar publishes its entries here, and this view is
// what rebuilds the bar when they change.
public protocol OneNativeToolbarHost: OneNativeCompositionParent {
  func toolbarChanged()
}

final class OneNativeNavigationStackModel: ObservableObject {
  @Published var content: UIView?
  @Published var toolbarEntries: [OneNativeToolbarEntry] = []
  @Published var swiftStyle = OneNativeStyle()
  var onLayout: ((CGRect) -> Void)?
  var onSDKEvent: ((String, String) -> Void)?
  var active = false

  func emitSDKEvent(_ name: String, _ value: String) {
    if active { onSDKEvent?(name, value) }
  }
}

private struct OneNativeNavigationStackRoot: View {
  @ObservedObject var model: OneNativeNavigationStackModel
  weak var host: OneNativeNavigationStackView?

  var body: some View {
    NavigationStack {
      content
    }
  }

  // the stack's own style and its toolbar attach to the root content. navigationTitle and
  // every other navigation modifier are read from inside the stack, so they sit on what
  // the stack presents rather than on the stack itself.
  private var content: some View {
    Group {
      if let view = model.content {
        OneNativeSlot(
          content: view, mode: .fill, layoutHost: host,
          onLayout: { frame in model.onLayout?(frame) }
        )
        .frame(maxWidth: .infinity, maxHeight: .infinity)
      } else {
        Color.clear
      }
    }
    .oneNativeStyle(model.swiftStyle, emit: model.emitSDKEvent)
    .toolbar {
      ForEach(model.toolbarEntries) { entry in
        OneNativeToolbarEntryContent(entry: entry)
      }
    }
  }
}

// Swift.NavigationStack: a real SwiftUI NavigationStack whose root is the React Native
// content, with the navigation bar filled by the Toolbar markers beside that content.
@objcMembers
public final class OneNativeNavigationStackView: UIView, OneNativeToolbarHost {
  public var onSDKEvent: ((String, String) -> Void)?
  private var model = OneNativeNavigationStackModel()
  private var controller: OneNativeHostingController<OneNativeNavigationStackRoot>?
  private var toolbars: [OneNativeToolbarView] = []
  private var active = false

  // the stack is the root of its own hosted tree, so it is active exactly while that
  // controller is attached, and a toolbar inherits that state the way a composed child
  // inherits its parent's.
  public var compositionActive: Bool { active }

  private func setActive(_ next: Bool) {
    guard active != next else { return }
    active = next
    for toolbar in toolbars { toolbar.propagateActive(next) }
  }

  public override init(frame: CGRect) {
    super.init(frame: frame)
  }

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

  public func mountToolbar(_ toolbar: OneNativeToolbarView) {
    toolbars.append(toolbar)
    toolbar.composeInto(self)
    publishToolbars()
  }

  public func unmountToolbar(_ toolbar: OneNativeToolbarView) {
    toolbars.removeAll { $0 === toolbar }
    toolbar.decompose()
    publishToolbars()
  }

  public func toolbarChanged() { publishToolbars() }

  private func publishToolbars() {
    model.toolbarEntries = toolbars.flatMap(\\.entries)
  }

  public func configureStyle(_ style: [String: Any]) {
    let next = OneNativeStyle(dictionary: style)
    if model.swiftStyle != next { model.swiftStyle = next }
  }

  public override func didMoveToWindow() { super.didMoveToWindow(); updateHost() }
  public override func layoutSubviews() { super.layoutSubviews(); updateHost() }

  private func updateHost() {
    model.active = false
    guard window != nil else {
      controller?.detach()
      setActive(false)
      return
    }
    if controller == nil {
      model.onSDKEvent = { [weak self] name, value in self?.onSDKEvent?(name, value) }
      controller = OneNativeHostingController(
        rootView: OneNativeNavigationStackRoot(model: model, host: self), screenInsets: true)
    }
    controller?.attach(to: self)
    let attached = controller?.isAttached == true
    model.active = attached
    setActive(attached)
  }

  public func reset() {
    model.active = false
    model.onSDKEvent = nil
    model.onLayout = nil
    setActive(false)
    for toolbar in toolbars { toolbar.decompose() }
    toolbars.removeAll()
    controller?.detach()
    controller = nil
    model = OneNativeNavigationStackModel()
  }
}
`
  )
  outputs.set(
    'ios/Generated/OneNativeToolbarView.swift',
    header +
      `import SwiftUI
import UIKit

// one entry a toolbar marker published. an entry is SwiftUI ToolbarContent, not a view:
// that is what .toolbar { } builds, and the hosting NavigationStack renders the entries
// with a ForEach the way SwiftUI itself composes toolbar content.
struct OneNativeToolbarEntry: Identifiable {
  enum Kind { case item, group, spacer }

  let id: ObjectIdentifier
  let kind: Kind
  let placement: String
  let sizing: String
  let label: String
  let systemImage: String
  let content: AnyView?
}

// a group is labelled when it carries a label and plain otherwise: the two initializers
// SwiftUI declares for ToolbarItemGroup.
struct OneNativeToolbarEntryContent: ToolbarContent {
  let entry: OneNativeToolbarEntry

  var body: some ToolbarContent {
    switch entry.kind {
    case .item:
      ToolbarItem(placement: OneNativeGenerated.toolbarItemPlacement(entry.placement)) {
        entry.content ?? AnyView(EmptyView())
      }
    case .group:
      if entry.label.isEmpty {
        ToolbarItemGroup(placement: OneNativeGenerated.toolbarItemPlacement(entry.placement)) {
          entry.content ?? AnyView(EmptyView())
        }
      } else {
        ToolbarItemGroup(
          placement: OneNativeGenerated.toolbarItemPlacement(entry.placement),
          content: { entry.content ?? AnyView(EmptyView()) },
          label: {
            if entry.systemImage.isEmpty { Text(entry.label) }
            else { Label(entry.label, systemImage: entry.systemImage) }
          })
      }
    case .spacer:
${spacerBranch}
    }
  }
}

final class OneNativeToolbarMarkerModel: ObservableObject {
  @Published var kind = "item"
  @Published var placement = "automatic"
  @Published var sizing = "flexible"
  @Published var label = ""
  @Published var systemImage = ""
  @Published var swiftStyle = OneNativeStyle()
  var onEntryChange: (() -> Void)?
  var onSDKEvent: ((String, String) -> Void)?
  func emitSDKEvent(_ name: String, _ value: String) { onSDKEvent?(name, value) }
}

private struct OneNativeToolbarMarkerContent: View {
  @ObservedObject var model: OneNativeToolbarMarkerModel
  @ObservedObject var children: OneNativeChildren

  var body: some View {
    ForEach(children.items) { child in child.content }
      .oneNativeStyle(model.swiftStyle, emit: model.emitSDKEvent)
  }
}

// a ToolbarItem, a ToolbarItemGroup, or a ToolbarSpacer. all three are the same marker:
// they compose their children and hand the hosting bar one entry to render, and they
// render nothing where they sit.
@objcMembers
public final class OneNativeToolbarMarkerView: OneNativeContainerView {
  private let model: OneNativeToolbarMarkerModel

  public init() {
    let model = OneNativeToolbarMarkerModel()
    self.model = model
    super.init(wrap: { children, _ in
      AnyView(OneNativeToolbarMarkerContent(model: model, children: children))
    })
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) is unavailable") }

  public func configure(kind: String, placement: String, sizing: String, label: String, systemImage: String) {
    var changed = false
    if model.kind != kind { model.kind = kind; changed = true }
    if model.placement != placement { model.placement = placement; changed = true }
    if model.sizing != sizing { model.sizing = sizing; changed = true }
    if model.label != label { model.label = label; changed = true }
    if model.systemImage != systemImage { model.systemImage = systemImage; changed = true }
    if changed { model.onEntryChange?() }
  }

  public func configureStyle(_ style: [String: Any]) {
    let next = OneNativeStyle(dictionary: style)
    if model.swiftStyle != next { model.swiftStyle = next }
  }

  public func setOnEntryChange(_ callback: (() -> Void)?) { model.onEntryChange = callback }
  public func setOnSDKEvent(_ callback: ((String, String) -> Void)?) { model.onSDKEvent = callback }

  func entry() -> OneNativeToolbarEntry {
    let kind: OneNativeToolbarEntry.Kind =
      model.kind == "group" ? .group : model.kind == "spacer" ? .spacer : .item
    return OneNativeToolbarEntry(
      id: ObjectIdentifier(self),
      kind: kind,
      placement: model.placement,
      sizing: model.sizing,
      label: model.label,
      systemImage: model.systemImage,
      content: compositionContent()
    )
  }
}

// a marker collection: Swift.Toolbar. it owns no bar of its own, so it publishes its
// entries to the container that hosts it.
@objcMembers
public final class OneNativeToolbarView: OneNativeContainerView {
  private var markers: [OneNativeToolbarMarkerView] = []
  private weak var host: OneNativeToolbarHost?

  public init() {
    super.init(wrap: { _, _ in AnyView(EmptyView()) })
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) is unavailable") }

  var entries: [OneNativeToolbarEntry] { markers.map { $0.entry() } }

  // a toolbar only means something inside a container that has a bar. anywhere else it
  // would silently drop every item it holds.
  public override func composeInto(_ parent: OneNativeCompositionParent) {
    guard let host = parent as? OneNativeToolbarHost else {
      preconditionFailure(
        "Swift.Toolbar must be a direct child of Swift.NavigationStack, a Swift.NavigationSplitView column, or Swift.TabView")
    }
    self.host = host
    super.composeInto(parent)
    host.toolbarChanged()
  }

  public override func decompose() {
    host = nil
    super.decompose()
  }

  // a marker is captured into the bar rather than published with content, the way an
  // overlay marker is captured into an overlay. the base still records it so activation
  // propagates into the marker's own children.
  public override func insertChild(_ child: UIView, at index: Int) {
    guard let marker = child as? OneNativeToolbarMarkerView else {
      preconditionFailure(
        "Swift.Toolbar takes Swift.ToolbarItem, Swift.ToolbarItemGroup, and Swift.ToolbarSpacer children")
    }
    marker.setOnEntryChange { [weak self] in self?.entryChanged() }
    super.insertChild(child, at: index)
    markers.insert(marker, at: min(index, markers.count))
    entryChanged()
  }

  public override func removeChild(_ child: UIView) {
    guard let marker = child as? OneNativeToolbarMarkerView,
      let index = markers.firstIndex(where: { $0 === child })
    else { return }
    markers.remove(at: index)
    marker.setOnEntryChange(nil)
    super.removeChild(child)
    entryChanged()
  }

  public override func reset() {
    for marker in markers {
      marker.setOnEntryChange(nil)
      marker.decompose()
    }
    markers.removeAll()
    host = nil
    super.reset()
  }

  private func entryChanged() { host?.toolbarChanged() }
}
`
  )
  outputs.set(
    'ios/Generated/OneNativeNavigationStackComponentView.h',
    `${header}#ifdef __cplusplus
#import "OneNativeContainerComponentView.h"
#import <React/RCTViewComponentView.h>
@class OneNativeToolbarView;
@interface OneNativeNavigationStackComponentView : RCTViewComponentView
@end
@interface OneNativeNavigationStackContentComponentView : RCTViewComponentView
- (void)updateNativeFrame:(CGRect)frame;
@end
@interface OneNativeToolbarComponentView : OneNativeContainerComponentView
@property (nonatomic, readonly, strong) OneNativeToolbarView *toolbarView;
@end
@interface OneNativeToolbarItemComponentView : OneNativeContainerComponentView
@end
@interface OneNativeToolbarItemGroupComponentView : OneNativeContainerComponentView
@end
@interface OneNativeToolbarSpacerComponentView : OneNativeContainerComponentView
@end
#endif
`
  )
  const markerValue = (arg: (typeof navigationHost.markers)[number]['args'][number]) =>
    'fixed' in arg ? arg.fixed : `RCTNSStringFromString(next.${arg.prop})`
  const markerBlocks = navigationHost.markers
    .map((marker) => {
      const call = marker.args
        .map((arg, index) =>
          index === 0
            ? `configureWith${arg.label[0].toUpperCase()}${arg.label.slice(1)}:${markerValue(arg)}`
            : `${arg.label}:${markerValue(arg)}`
        )
        .join('\n    ')
      const view = `${marker.component}ComponentView`
      const wiring = marker.sdkEvent
        ? `    __weak ${view} *weakSelf = self;
    [_markerView setOnSDKEvent:^(NSString *name, NSString *value) {
      ${view} *strongSelf = weakSelf;
      if (!strongSelf || !strongSelf->_eventEmitter) return;
      auto emitter = std::static_pointer_cast<const ${marker.component}EventEmitter>(strongSelf->_eventEmitter);
      emitter->onNativeSDKEvent({.name = std::string(name.UTF8String), .value = std::string(value.UTF8String)});
    }];
`
        : ''
      const style = marker.style
        ? `\n  [_markerView configureStyle:OneNativeStyleDictionary(next.swiftStyle)];`
        : ''
      const props = `${marker.component}Props`
      return `@implementation ${view} {
  OneNativeToolbarMarkerView *_markerView;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<${marker.component}ComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const ${props}>();
    _markerView = [OneNativeToolbarMarkerView new];
    self.container = _markerView;
    self.contentView = _markerView;
${wiring}  }
  return self;
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
  const auto &next = *std::static_pointer_cast<const ${props}>(props);
  [_markerView ${call}];${style}
  [super updateProps:props oldProps:oldProps];
}

@end`
    })
    .join('\n\n')
  outputs.set(
    'ios/Generated/OneNativeNavigationStackComponentView.mm',
    `${header}#include <cmath>
#import "OneNativeNavigationStackComponentView.h"
#import "OneNativeContainerComponentView.h"
#import <React/RCTView.h>
#import "One-Swift.h"
#import "OneNativeNavigationStackContentShadowNode.h"
#import "OneNativeStyleDictionary.h"
#import <react/renderer/components/OneNativeSpec/ComponentDescriptors.h>
#import <react/renderer/components/OneNativeSpec/Props.h>
#import <react/renderer/components/OneNativeSpec/EventEmitters.h>
#import <React/RCTConversions.h>

using namespace facebook::react;

@implementation OneNativeNavigationStackComponentView {
  OneNativeNavigationStackView *_stackView;
  NSMutableArray<OneNativeToolbarView *> *_toolbars;
  __weak OneNativeNavigationStackContentComponentView *_content;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<OneNativeNavigationStackComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const OneNativeNavigationStackProps>();
    _toolbars = [NSMutableArray new];
    _stackView = [OneNativeNavigationStackView new];
    self.contentView = _stackView;
    __weak OneNativeNavigationStackComponentView *weakSelf = self;
    _stackView.onSDKEvent = ^(NSString *name, NSString *value) {
      OneNativeNavigationStackComponentView *strongSelf = weakSelf;
      if (!strongSelf || !strongSelf->_eventEmitter) return;
      auto emitter = std::static_pointer_cast<const OneNativeNavigationStackEventEmitter>(strongSelf->_eventEmitter);
      emitter->onNativeSDKEvent({.name = std::string(name.UTF8String), .value = std::string(value.UTF8String)});
    };
  }
  return self;
}

// the stack takes one content child and any number of Toolbar markers. anything else can
// never render here, and publication would drop it without saying so.
- (void)mountChildComponentView:(UIView<RCTComponentViewProtocol> *)child index:(NSInteger)index {
  if ([child isKindOfClass:OneNativeNavigationStackContentComponentView.class]) {
    OneNativeNavigationStackContentComponentView *content = (OneNativeNavigationStackContentComponentView *)child;
    __weak OneNativeNavigationStackContentComponentView *weakContent = content;
    _content = content;
    [_stackView mountContent:child onLayout:^(CGRect frame) { [weakContent updateNativeFrame:frame]; }];
    return;
  }
  if ([child isKindOfClass:OneNativeToolbarComponentView.class]) {
    OneNativeToolbarView *toolbar = ((OneNativeToolbarComponentView *)child).toolbarView;
    [_toolbars addObject:toolbar];
    [_stackView mountToolbar:toolbar];
    return;
  }
  [NSException raise:@"OneNativeInvalidChild"
              format:@"Swift.NavigationStack takes Swift.Toolbar markers and the React Native "
                     @"content it renders. A second content child cannot render."];
}

- (void)unmountChildComponentView:(UIView<RCTComponentViewProtocol> *)child index:(NSInteger)index {
  if ([child isKindOfClass:OneNativeNavigationStackContentComponentView.class]) {
    if (_content == child) _content = nil;
    [_stackView unmountContent:child];
    return;
  }
  if ([child isKindOfClass:OneNativeToolbarComponentView.class]) {
    OneNativeToolbarView *toolbar = ((OneNativeToolbarComponentView *)child).toolbarView;
    [_toolbars removeObjectIdenticalTo:toolbar];
    [_stackView unmountToolbar:toolbar];
  }
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
  const auto &next = *std::static_pointer_cast<const OneNativeNavigationStackProps>(props);
  [_stackView configureStyle:OneNativeStyleDictionary(next.swiftStyle)];
  [super updateProps:props oldProps:oldProps];
}

- (void)prepareForRecycle {
  [super prepareForRecycle];
  _content = nil;
  [_toolbars removeAllObjects];
  [_stackView reset];
}

@end

@implementation OneNativeNavigationStackContentComponentView {
  OneNativeNavigationStackContentShadowNode::ConcreteState::Shared _slotState;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<OneNativeNavigationStackContentComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const OneNativeNavigationStackContentProps>();
  }
  return self;
}

- (void)updateState:(State::Shared const &)state oldState:(State::Shared const &)oldState {
  _slotState = std::static_pointer_cast<const OneNativeNavigationStackContentShadowNode::ConcreteState>(state);
}

- (void)updateNativeFrame:(CGRect)frame {
  if (!_slotState || !std::isfinite(frame.size.width) || !std::isfinite(frame.size.height)) return;
  const auto &old = _slotState->getData();
  const facebook::react::Size size{(Float)frame.size.width, (Float)frame.size.height};
  if (old.measured && old.size == size) return;
  OneNativeSlotState data;
  data.size = size;
  data.measured = true;
  _slotState->updateState(std::move(data));
}

- (void)updateLayoutMetrics:(LayoutMetrics const &)layoutMetrics oldLayoutMetrics:(LayoutMetrics const &)oldLayoutMetrics {
  [super updateLayoutMetrics:layoutMetrics oldLayoutMetrics:oldLayoutMetrics];
  // SwiftUI owns placement. Fabric owns the content bounds and the descendants' layout.
  self.frame = (CGRect){CGPointZero, self.bounds.size};
}

- (void)prepareForRecycle {
  [super prepareForRecycle];
  _slotState.reset();
}

@end

@implementation OneNativeToolbarComponentView {
  OneNativeToolbarView *_toolbarView;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<OneNativeToolbarComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const OneNativeToolbarProps>();
    _toolbarView = [OneNativeToolbarView new];
    self.container = _toolbarView;
    self.contentView = _toolbarView;
  }
  return self;
}

- (OneNativeToolbarView *)toolbarView { return _toolbarView; }

@end

// the three markers are one Swift view configured by kind, so each component view only
// reads its own props into that shared shape.
${markerBlocks}
`
  )
  outputs.set(
    'cpp/OneNativeNavigationStackContentShadowNode.h',
    `${header}#pragma once
#ifdef __cplusplus
#include <react/renderer/components/OneNativeSpec/EventEmitters.h>
#include <react/renderer/components/OneNativeSpec/Props.h>
#include "OneNativeSlotShadowNode.h"
namespace facebook::react {
extern const char OneNativeNavigationStackContentComponentName[];
using OneNativeNavigationStackContentShadowNode = OneNativeSlotShadowNode<OneNativeNavigationStackContentComponentName, OneNativeNavigationStackContentProps, OneNativeNavigationStackContentEventEmitter>;
using OneNativeNavigationStackContentComponentDescriptor = OneNativeSlotComponentDescriptor<OneNativeNavigationStackContentShadowNode>;
}
#endif
`
  )
  outputs.set(
    'cpp/OneNativeNavigationStackContentShadowNode.cpp',
    `${header}#include "OneNativeNavigationStackContentShadowNode.h"

namespace facebook::react {
extern const char OneNativeNavigationStackContentComponentName[] = "OneNativeNavigationStackContent";
}
`
  )
  const compact = selectConstructor(inventory, {
    type: 'NavigationSplitView',
    parameters: navigationHost.split.initializers.find((initializer) => initializer.gated)!.parameters,
  })
  const gate = Number.isInteger(ios(compact)) ? `${ios(compact)}.0` : `${ios(compact)}`
  const splitRow = (
    [...containerComponents, ...contentComponents] as unknown as readonly NavSpec[]
  ).find((row) => row.name === 'OneNativeNavigationSplitView')!
  const swiftParam = (label: string, prop: string) => {
    const type = splitRow.props[prop]
    const swift = type === 'boolean' ? 'Bool' : type === 'string' ? 'String' : 'Int'
    return `${label === prop ? prop : `${label} ${prop}`}: ${swift}`
  }
  const configureParams = navigationHost.split.configure
    .map(({ label, prop }) => swiftParam(label, prop))
    .join(',\n')
  const objcValue = (prop: string) =>
    splitRow.props[prop] === 'string' ? `RCTNSStringFromString(next.${prop})` : `next.${prop}`
  const configureCall = navigationHost.split.configure
    .map(({ label, prop }, index) =>
      index === 0
        ? `configureWith${label[0].toUpperCase()}${label.slice(1)}:${objcValue(prop)}`
        : `${label}:${objcValue(prop)}`
    )
    .join('\n    ')
  const forward = (table: { members: readonly string[]; default: string }) =>
    `${table.members.map((member) => `    case "${member}": return .${member}`).join('\n')}\n    default: return .${table.default}`
  const backward = (table: { members: readonly string[]; default: string }) =>
    `${table.members.map((member) => `    case .${member}: return "${member}"`).join('\n')}\n    default: return "${table.default}"`
  outputs.set(
    'ios/Generated/OneNativeNavigationSplitViewView.swift',
    header +
      `import SwiftUI
import UIKit

private final class NavigationSplitViewModel: ObservableObject {
  @Published var columns: [OneNativeNavigationSplitViewColumnView] = []
  @Published var columnVisibility = "automatic"
  @Published var columnVisibilityIsControlled = false
  @Published var uncontrolledColumnVisibility = "automatic"
  @Published var preferredCompactColumn = "sidebar"
  @Published var preferredCompactColumnIsControlled = false
  @Published var uncontrolledCompactColumn = "sidebar"
  @Published var swiftStyle = OneNativeStyle()
  var active = false
  var onColumnVisibilityChange: ((String) -> Void)?
  var onPreferredCompactColumnChange: ((String) -> Void)?
  var onSDKEvent: ((String, String) -> Void)?

  var currentColumnVisibility: String {
    columnVisibilityIsControlled ? columnVisibility : uncontrolledColumnVisibility
  }

  var currentCompactColumn: String {
    preferredCompactColumnIsControlled ? preferredCompactColumn : uncontrolledCompactColumn
  }

  var columnVisibilityBinding: Binding<NavigationSplitViewVisibility> {
    Binding(
      get: { [self] in visibility(currentColumnVisibility) },
      set: { [self] next in
        let value = visibilityName(next)
        guard value != currentColumnVisibility else { return }
        if !columnVisibilityIsControlled { uncontrolledColumnVisibility = value }
        if active { onColumnVisibilityChange?(value) }
      }
    )
  }

  @available(iOS ${gate}, *)
  var compactColumnBinding: Binding<NavigationSplitViewColumn> {
    Binding(
      get: { [self] in compactColumn(currentCompactColumn) },
      set: { [self] next in
        let value = compactColumnName(next)
        guard value != currentCompactColumn else { return }
        if !preferredCompactColumnIsControlled { uncontrolledCompactColumn = value }
        if active { onPreferredCompactColumnChange?(value) }
      }
    )
  }

  func configure(
    ${configureParams.replaceAll('\n', '\n    ')}
  ) {
    self.columnVisibility = columnVisibility
    self.columnVisibilityIsControlled = columnVisibilityIsControlled
    self.preferredCompactColumn = preferredCompactColumn
    self.preferredCompactColumnIsControlled = preferredCompactColumnIsControlled
  }

  func column(_ name: String) -> OneNativeNavigationSplitViewColumnView? {
    columns.first { $0.columnName == name }
  }

  func emitSDKEvent(_ name: String, _ value: String) {
    if active { onSDKEvent?(name, value) }
  }

  private func visibility(_ value: String) -> NavigationSplitViewVisibility {
    switch value {
${forward(navigationHost.split.visibility)}
    }
  }

  private func visibilityName(_ value: NavigationSplitViewVisibility) -> String {
    switch value {
${backward(navigationHost.split.visibility)}
    }
  }

  @available(iOS ${gate}, *)
  private func compactColumn(_ value: String) -> NavigationSplitViewColumn {
    switch value {
${forward(navigationHost.split.compactColumn)}
    }
  }

  @available(iOS ${gate}, *)
  private func compactColumnName(_ value: NavigationSplitViewColumn) -> String {
    switch value {
${backward(navigationHost.split.compactColumn)}
    }
  }
}

@objcMembers
public final class OneNativeNavigationSplitViewColumnView: UIView, OneNativeToolbarHost, ObservableObject {
  @Published var content: UIView?
  @Published var toolbarEntries: [OneNativeToolbarEntry] = []
  @Published var swiftStyle = OneNativeStyle()
  @Published public private(set) var columnName = "sidebar"
  public var onSDKEvent: ((String, String) -> Void)?
  public var compositionActive: Bool { active }
  private var active = false
  private var toolbars: [OneNativeToolbarView] = []
  private var onLayout: ((CGRect) -> Void)?

  public func configure(column: String, style: [String: Any]) {
    if columnName != column { columnName = column }
    let next = OneNativeStyle(dictionary: style)
    if swiftStyle != next { swiftStyle = next }
  }

  public func mountContent(_ view: UIView, onLayout: @escaping (CGRect) -> Void) {
    self.onLayout = onLayout
    content = view
  }

  public func unmountContent(_ view: UIView) {
    if content === view { content = nil }
    onLayout = nil
    view.removeFromSuperview()
  }

  public func mountToolbar(_ toolbar: OneNativeToolbarView) {
    toolbars.append(toolbar)
    toolbar.composeInto(self)
    publishToolbars()
  }

  public func unmountToolbar(_ toolbar: OneNativeToolbarView) {
    toolbars.removeAll { $0 === toolbar }
    toolbar.decompose()
    publishToolbars()
  }

  public func toolbarChanged() { publishToolbars() }

  public func refreshRow(for child: UIView) {}

  public func propagateActive(_ next: Bool) {
    guard active != next else { return }
    active = next
    for toolbar in toolbars { toolbar.propagateActive(next) }
  }

  func emitSDKEvent(_ name: String, _ value: String) {
    if active { onSDKEvent?(name, value) }
  }

  public func reset() {
    propagateActive(false)
    for toolbar in toolbars { toolbar.decompose() }
    toolbars.removeAll()
    toolbarEntries = []
    content = nil
    onLayout = nil
    swiftStyle = OneNativeStyle()
    columnName = "sidebar"
  }

  private func publishToolbars() {
    toolbarEntries = toolbars.flatMap(\\.entries)
  }
}

private struct NavigationSplitViewColumnContent: View {
  @ObservedObject var column: OneNativeNavigationSplitViewColumnView
  weak var host: OneNativeNavigationSplitViewView?

  var body: some View {
    Group {
      if let content = column.content {
        OneNativeSlot(
          content: content,
          mode: .fill,
          layoutHost: host,
          onLayout: { frame in column.updateNativeFrame(frame) }
        )
        .frame(maxWidth: .infinity, maxHeight: .infinity)
      } else {
        Color.clear
      }
    }
    .oneNativeStyle(column.swiftStyle, emit: column.emitSDKEvent)
    .toolbar {
      ForEach(column.toolbarEntries) { entry in
        OneNativeToolbarEntryContent(entry: entry)
      }
    }
  }
}

private struct NavigationSplitViewRoot: View {
  @ObservedObject var model: NavigationSplitViewModel
  weak var host: OneNativeNavigationSplitViewView?

  var body: some View {
    Group {
      if #available(iOS ${gate}, *) {
        splitViewWithCompactColumn
      } else {
        splitViewWithoutCompactColumn
      }
    }
    .oneNativeStyle(model.swiftStyle, emit: model.emitSDKEvent)
  }

  @available(iOS ${gate}, *)
  @ViewBuilder private var splitViewWithCompactColumn: some View {
    if model.column("content") != nil {
      NavigationSplitView(
        columnVisibility: model.columnVisibilityBinding,
        preferredCompactColumn: model.compactColumnBinding
      ) {
        columnContent("sidebar")
      } content: {
        columnContent("content")
      } detail: {
        columnContent("detail")
      }
    } else {
      NavigationSplitView(
        columnVisibility: model.columnVisibilityBinding,
        preferredCompactColumn: model.compactColumnBinding
      ) {
        columnContent("sidebar")
      } detail: {
        columnContent("detail")
      }
    }
  }

  @ViewBuilder private var splitViewWithoutCompactColumn: some View {
    if model.column("content") != nil {
      NavigationSplitView(columnVisibility: model.columnVisibilityBinding) {
        columnContent("sidebar")
      } content: {
        columnContent("content")
      } detail: {
        columnContent("detail")
      }
    } else {
      NavigationSplitView(columnVisibility: model.columnVisibilityBinding) {
        columnContent("sidebar")
      } detail: {
        columnContent("detail")
      }
    }
  }

  private func columnContent(_ name: String) -> some View {
    Group {
      if let column = model.column(name) {
        NavigationSplitViewColumnContent(column: column, host: host)
      } else {
        Color.clear
      }
    }
  }
}

@objcMembers
public final class OneNativeNavigationSplitViewView: UIView {
  public var onColumnVisibilityChange: ((String) -> Void)?
  public var onPreferredCompactColumnChange: ((String) -> Void)?
  public var onSDKEvent: ((String, String) -> Void)?
  private var model = NavigationSplitViewModel()
  private var controller: OneNativeHostingController<NavigationSplitViewRoot>?
  private var active = false

  public override init(frame: CGRect) {
    super.init(frame: frame)
    model.onColumnVisibilityChange = { [weak self] value in
      self?.onColumnVisibilityChange?(value)
    }
    model.onPreferredCompactColumnChange = { [weak self] value in
      self?.onPreferredCompactColumnChange?(value)
    }
    model.onSDKEvent = { [weak self] name, value in self?.onSDKEvent?(name, value) }
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) is unavailable") }

  public func configure(
    ${configureParams.replaceAll('\n', '\n    ')}
  ) {
    model.configure(
      columnVisibility: columnVisibility,
      columnVisibilityIsControlled: columnVisibilityIsControlled,
      preferredCompactColumn: preferredCompactColumn,
      preferredCompactColumnIsControlled: preferredCompactColumnIsControlled
    )
  }

  public func configureStyle(_ style: [String: Any]) {
    let next = OneNativeStyle(dictionary: style)
    if model.swiftStyle != next { model.swiftStyle = next }
  }

  public func mountColumn(_ column: OneNativeNavigationSplitViewColumnView) {
    guard !model.columns.contains(where: { $0 === column }) else { return }
    column.propagateActive(active)
    model.columns.append(column)
  }

  public func unmountColumn(_ column: OneNativeNavigationSplitViewColumnView) {
    model.columns.removeAll { $0 === column }
    column.propagateActive(false)
  }

  public override func didMoveToWindow() {
    super.didMoveToWindow()
    updateHost()
  }

  public override func layoutSubviews() {
    super.layoutSubviews()
    updateHost()
    controller?.view.frame = bounds
  }

  private func updateHost() {
    guard window != nil else {
      controller?.detach()
      setActive(false)
      return
    }
    if controller == nil {
      controller = OneNativeHostingController(
        rootView: NavigationSplitViewRoot(model: model, host: self), screenInsets: true)
    }
    controller?.attach(to: self)
    setActive(controller?.isAttached == true)
  }

  private func setActive(_ next: Bool) {
    guard active != next else { return }
    active = next
    model.active = next
    for column in model.columns { column.propagateActive(next) }
  }

  public func reset() {
    setActive(false)
    controller?.detach()
    controller = nil
    model.columns = []
    model.columnVisibility = "automatic"
    model.columnVisibilityIsControlled = false
    model.uncontrolledColumnVisibility = "automatic"
    model.preferredCompactColumn = "sidebar"
    model.preferredCompactColumnIsControlled = false
    model.uncontrolledCompactColumn = "sidebar"
    model.swiftStyle = OneNativeStyle()
  }
}

extension OneNativeNavigationSplitViewColumnView {
  fileprivate func updateNativeFrame(_ frame: CGRect) { onLayout?(frame) }
}
`
  )
  outputs.set(
    'ios/Generated/OneNativeNavigationSplitViewComponentView.h',
    `${header}#ifdef __cplusplus
#import <React/RCTViewComponentView.h>
#import "OneNativeNavigationStackComponentView.h"
@class OneNativeNavigationSplitViewView;
@class OneNativeNavigationSplitViewColumnView;
@interface OneNativeNavigationSplitViewComponentView : RCTViewComponentView
@end
@interface OneNativeNavigationSplitViewColumnComponentView : RCTViewComponentView
@property (nonatomic, readonly, strong) OneNativeNavigationSplitViewColumnView *columnView;
@end
#endif
`
  )
  outputs.set(
    'ios/Generated/OneNativeNavigationSplitViewComponentView.mm',
    `${header}#import "OneNativeNavigationSplitViewComponentView.h"
#import <React/RCTView.h>
#import "One-Swift.h"
#import "OneNativeStyleDictionary.h"
#import <react/renderer/components/OneNativeSpec/ComponentDescriptors.h>
#import <react/renderer/components/OneNativeSpec/EventEmitters.h>
#import <React/RCTConversions.h>

using namespace facebook::react;

@implementation OneNativeNavigationSplitViewComponentView {
  OneNativeNavigationSplitViewView *_splitView;
  NSMutableArray<OneNativeNavigationSplitViewColumnComponentView *> *_columns;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<OneNativeNavigationSplitViewComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const OneNativeNavigationSplitViewProps>();
    _columns = [NSMutableArray new];
    _splitView = [OneNativeNavigationSplitViewView new];
    self.contentView = _splitView;
    __weak OneNativeNavigationSplitViewComponentView *weakSelf = self;
    _splitView.onColumnVisibilityChange = ^(NSString *visibility) {
      OneNativeNavigationSplitViewComponentView *strongSelf = weakSelf;
      if (!strongSelf || !strongSelf->_eventEmitter) return;
      auto emitter = std::static_pointer_cast<const OneNativeNavigationSplitViewEventEmitter>(strongSelf->_eventEmitter);
      emitter->onNativeNavigationSplitViewColumnVisibilityChange({.visibility = std::string(visibility.UTF8String)});
    };
    _splitView.onPreferredCompactColumnChange = ^(NSString *column) {
      OneNativeNavigationSplitViewComponentView *strongSelf = weakSelf;
      if (!strongSelf || !strongSelf->_eventEmitter) return;
      auto emitter = std::static_pointer_cast<const OneNativeNavigationSplitViewEventEmitter>(strongSelf->_eventEmitter);
      emitter->onNativeNavigationSplitViewPreferredCompactColumnChange({.column = std::string(column.UTF8String)});
    };
    _splitView.onSDKEvent = ^(NSString *name, NSString *value) {
      OneNativeNavigationSplitViewComponentView *strongSelf = weakSelf;
      if (!strongSelf || !strongSelf->_eventEmitter) return;
      auto emitter = std::static_pointer_cast<const OneNativeNavigationSplitViewEventEmitter>(strongSelf->_eventEmitter);
      emitter->onNativeSDKEvent({.name = std::string(name.UTF8String), .value = std::string(value.UTF8String)});
    };
  }
  return self;
}

- (void)mountChildComponentView:(UIView<RCTComponentViewProtocol> *)child index:(NSInteger)index {
  if (![child isKindOfClass:OneNativeNavigationSplitViewColumnComponentView.class]) {
    [NSException raise:@"OneNativeInvalidChild"
                format:@"Swift.NavigationSplitView takes Sidebar, Content, and Detail column markers."];
  }
  OneNativeNavigationSplitViewColumnComponentView *column =
    (OneNativeNavigationSplitViewColumnComponentView *)child;
  NSString *name = column.columnView.columnName;
  if (![@[@"sidebar", @"content", @"detail"] containsObject:name]) {
    [NSException raise:@"OneNativeInvalidSlot"
                format:@"Swift.NavigationSplitView has an invalid column: %@", name];
  }
  for (OneNativeNavigationSplitViewColumnComponentView *mounted in _columns) {
    if ([mounted.columnView.columnName isEqualToString:name]) {
      [NSException raise:@"OneNativeInvalidSlot"
                  format:@"Swift.NavigationSplitView accepts one %@ column.", name];
    }
  }
  [_columns insertObject:column atIndex:MIN(index, _columns.count)];
  [_splitView mountColumn:column.columnView];
}

- (void)unmountChildComponentView:(UIView<RCTComponentViewProtocol> *)child index:(NSInteger)index {
  if (![child isKindOfClass:OneNativeNavigationSplitViewColumnComponentView.class]) return;
  OneNativeNavigationSplitViewColumnComponentView *column =
    (OneNativeNavigationSplitViewColumnComponentView *)child;
  [_columns removeObjectIdenticalTo:column];
  [_splitView unmountColumn:column.columnView];
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
  const auto &next = *std::static_pointer_cast<const OneNativeNavigationSplitViewProps>(props);
  [_splitView ${configureCall.split('\n').join('\n    ')}];
  [_splitView configureStyle:OneNativeStyleDictionary(next.swiftStyle)];
  [super updateProps:props oldProps:oldProps];
}

- (void)prepareForRecycle {
  [super prepareForRecycle];
  for (OneNativeNavigationSplitViewColumnComponentView *column in _columns) {
    [_splitView unmountColumn:column.columnView];
  }
  [_columns removeAllObjects];
  [_splitView reset];
}

@end

@implementation OneNativeNavigationSplitViewColumnComponentView {
  OneNativeNavigationSplitViewColumnView *_columnView;
  __weak OneNativeNavigationStackContentComponentView *_content;
  NSMutableArray<OneNativeToolbarView *> *_toolbars;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<OneNativeNavigationSplitViewColumnComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const OneNativeNavigationSplitViewColumnProps>();
    _toolbars = [NSMutableArray new];
    _columnView = [OneNativeNavigationSplitViewColumnView new];
    self.contentView = _columnView;
    __weak OneNativeNavigationSplitViewColumnComponentView *weakSelf = self;
    _columnView.onSDKEvent = ^(NSString *name, NSString *value) {
      OneNativeNavigationSplitViewColumnComponentView *strongSelf = weakSelf;
      if (!strongSelf || !strongSelf->_eventEmitter) return;
      auto emitter = std::static_pointer_cast<const OneNativeNavigationSplitViewColumnEventEmitter>(strongSelf->_eventEmitter);
      emitter->onNativeSDKEvent({.name = std::string(name.UTF8String), .value = std::string(value.UTF8String)});
    };
  }
  return self;
}

- (OneNativeNavigationSplitViewColumnView *)columnView { return _columnView; }

- (void)mountChildComponentView:(UIView<RCTComponentViewProtocol> *)child index:(NSInteger)index {
  if ([child isKindOfClass:OneNativeNavigationStackContentComponentView.class]) {
    if (_content) {
      [NSException raise:@"OneNativeInvalidSlot"
                  format:@"Swift.NavigationSplitView column takes one React Native content slot."];
    }
    OneNativeNavigationStackContentComponentView *content =
      (OneNativeNavigationStackContentComponentView *)child;
    __weak OneNativeNavigationStackContentComponentView *weakContent = content;
    _content = content;
    [_columnView mountContent:child onLayout:^(CGRect frame) {
      [weakContent updateNativeFrame:frame];
    }];
    return;
  }
  if ([child isKindOfClass:OneNativeToolbarComponentView.class]) {
    if (_toolbars.count > 0) {
      [NSException raise:@"OneNativeInvalidSlot"
                  format:@"Swift.NavigationSplitView column takes one Swift.Toolbar."];
    }
    OneNativeToolbarView *toolbar = ((OneNativeToolbarComponentView *)child).toolbarView;
    [_toolbars addObject:toolbar];
    [_columnView mountToolbar:toolbar];
    return;
  }
  [NSException raise:@"OneNativeInvalidChild"
              format:@"Swift.NavigationSplitView column takes Swift.Toolbar and its React Native content."];
}

- (void)unmountChildComponentView:(UIView<RCTComponentViewProtocol> *)child index:(NSInteger)index {
  if ([child isKindOfClass:OneNativeNavigationStackContentComponentView.class]) {
    if (_content == child) _content = nil;
    [_columnView unmountContent:child];
    return;
  }
  if ([child isKindOfClass:OneNativeToolbarComponentView.class]) {
    OneNativeToolbarView *toolbar = ((OneNativeToolbarComponentView *)child).toolbarView;
    [_toolbars removeObjectIdenticalTo:toolbar];
    [_columnView unmountToolbar:toolbar];
  }
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
  const auto &next = *std::static_pointer_cast<const OneNativeNavigationSplitViewColumnProps>(props);
  [_columnView configureWithColumn:RCTNSStringFromString(next.column)
    style:OneNativeStyleDictionary(next.swiftStyle)];
  [super updateProps:props oldProps:oldProps];
}

- (void)prepareForRecycle {
  [super prepareForRecycle];
  _content = nil;
  [_toolbars removeAllObjects];
  [_columnView reset];
}

@end
`
  )
}
