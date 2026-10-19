import { navigationHost } from './catalog'
import { containerComponents, contentComponents } from './emitContainers'
import {
  ios,
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

export function emitNavigationHost(
  header: string,
  outputs: Map<string, string>,
  inventory: readonly Declaration[],
  floor: number,
  ceiling: number
) {
  validateNavigationHost(inventory, floor, ceiling)
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
}
