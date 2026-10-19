import { components, menuRoot, nodes } from './catalog'
import {
  ios,
  present,
  selectConstructor,
  selectModifier,
  type Declaration,
} from './inventory'

type MenuSpec = {
  name: string
  props: Record<string, string>
  events: Record<string, Record<string, string>>
}

const menuComponent = () =>
  (components as unknown as readonly MenuSpec[]).find(
    (component) => component.name === 'OneNativeMenu'
  )!

const swiftTypeOf = (prop: string, type: string) => {
  if (type === 'boolean') return 'Bool'
  if (type === 'Int32') return 'Int'
  if (type === 'string') return 'String'
  throw new Error(`OneNativeMenu host: ${prop} carries ${type}, which configure cannot take`)
}

const objcArgumentOf = (prop: string, type: string) => {
  if (type === 'string') return `RCTNSStringFromString(next.${prop})`
  if (type === 'boolean' || type === 'Int32') return `next.${prop}`
  throw new Error(`OneNativeMenu host: ${prop} carries ${type}, which configure cannot take`)
}

// the SDK facts the menu host emits against: both root Menu initializers, every
// fixed style's member and modifier, and the spec surface the glue fills. the
// plain Menu initializer is the submenu node's constructor, reused rather than
// restated. anything missing, reshaped, or newer than the floor fails instead
// of emitting stale calls. the host carries no availability gates: menus ship
// at iOS 16 and below, under every floor that builds it. the UIKit context
// backend stays explicit semantic input: UIKit ships no scanned inventory.
export function validateMenuHost(
  inventory: readonly Declaration[],
  floor: number,
  ceiling: number,
  menu: MenuSpec = menuComponent()
) {
  const fail = (message: string): never => {
    throw new Error(`OneNativeMenu host: ${message}`)
  }
  const submenu = nodes.find((node) => node.kind === 'submenu')
  if (!submenu) fail('catalog nodes name no submenu constructor')
  for (const constructor of [
    submenu!.constructor,
    ...menuRoot.constructors,
  ]) {
    const declaration = selectConstructor(inventory, constructor)
    if (ios(declaration) > floor)
      fail(
        `${constructor.type}(${constructor.parameters.map((parameter) => parameter.label).join(', ')}) needs iOS ${ios(declaration)}, past the floor ${floor}`
      )
  }
  for (const style of menuRoot.styles) {
    const members = inventory.filter(
      (declaration) =>
        declaration.kind === 'static' &&
        declaration.owner === style.owner &&
        declaration.name === style.member &&
        declaration.parameters.length === 0 &&
        declaration.requirements?.length === 1 &&
        declaration.requirements[0] === `Self == ${style.type}` &&
        declaration.type === style.type &&
        present(declaration) &&
        ios(declaration) <= ceiling
    )
    if (members.length !== 1)
      fail(`${style.owner} has ${members.length} members spelling .${style.member}`)
    if (ios(members[0]) > floor)
      fail(`${style.owner}.${style.member} needs iOS ${ios(members[0])}, past the floor ${floor}`)
    const modifier = selectModifier(inventory, {
      name: style.modifier,
      parameters: [{ label: '_', type: 'S' }],
      requirements: [style.requirement],
    })
    if (ios(modifier) > floor)
      fail(`${style.modifier} needs iOS ${ios(modifier)}, past the floor ${floor}`)
  }
  for (const { prop, type } of menuRoot.configureArgs) {
    if (!(prop in menu.props)) fail(`configure prop ${prop} is not in the spec`)
    if (menu.props[prop] !== type)
      fail(`configure prop ${prop} carries ${menu.props[prop]}, not the ${type} the model reads`)
  }
  if (menu.props.items !== 'ReadonlyArray<NativeMenuItem>')
    fail(`items crosses as ${menu.props.items}, not a NativeMenuItem array`)
  const events: Record<string, Record<string, string>> = {
    onNativeMenuAction: { id: 'string' },
    onNativeMenuPrimaryAction: { kind: 'string' },
    onNativeMenuValueChange: {
      id: 'string',
      value: 'boolean',
      sourceIndex: 'Int32',
      eventCount: 'Int32',
      revision: 'Int32',
    },
    onNativeMenuPickerChange: { id: 'string', value: 'string', eventCount: 'Int32', revision: 'Int32' },
  }
  for (const [event, fields] of Object.entries(events)) {
    const declared = menu.events[event] ?? fail(`event ${event} is not in the spec`)
    if (JSON.stringify(declared) !== JSON.stringify(fields))
      fail(`${event} must carry ${Object.keys(fields).join(', ')}`)
  }
}

export function emitMenuHost(
  header: string,
  outputs: Map<string, string>,
  inventory: readonly Declaration[],
  floor: number,
  ceiling: number
) {
  const menu = menuComponent()
  validateMenuHost(inventory, floor, ceiling, menu)
  const configureParams = menuRoot.configureArgs
    .map(({ label, prop }) => {
      const name = label === '_' ? `_ ${prop}` : label === prop ? prop : `${label} ${prop}`
      return `${name}: ${swiftTypeOf(prop, menu.props[prop])}`
    })
    .join(',\n')
  const configureCall = menuRoot.configureArgs
    .map(({ label, prop }, index) => {
      const value = objcArgumentOf(prop, menu.props[prop])
      return index === 0 ? `configure:${value}` : `${label}:${value}`
    })
    .join('\n')
  const [configureFirst, ...configureRest] = configureCall.split('\n')
  outputs.set(
    'ios/Generated/OneNativeMenuView.swift',
    header +
      `import SwiftUI
import UIKit

final class OneNativeMenuModel: ObservableObject {
  @Published var children: [String: [OneNativeMenuNode]] = [:]
  @Published var trigger: UIView?
  @Published var size = CGSize.zero
  @Published var label = ""
  @Published var disabled = false
  @Published var hasPrimaryAction = false
  @Published var menuOrder = "automatic"
  @Published var menuActionDismissBehavior = "automatic"
  @Published var presentation = "menu"
  @Published var controlled = OneNativeControlled<[String: [Bool]]>([:])
  @Published var pickerControlled = OneNativeControlled<[String: String]>([:])
  var propValues: [String: [Bool]] = [:]
  var propPickerValues: [String: String] = [:]
  var active = false
  var items: [String: OneNativeMenuNode] = [:]
  var onAction: ((String) -> Void)?
  var onPrimaryAction: (() -> Void)?
  var onValueChange: ((String, Bool, Int, Int, Int) -> Void)?
  var onPickerChange: ((String, String, Int, Int) -> Void)?

  func action(_ id: String) {
    guard active, !disabled, let item = items[id], item.type == .action, !item.disabled, !item.hidden else { return }
    onAction?(id)
  }

  func primaryAction() {
    guard active, !disabled, hasPrimaryAction else { return }
    onPrimaryAction?()
  }

  func changeValue(_ id: String, index: Int, value: Bool) {
    guard active, !disabled, let item = items[id], item.type == .toggle, !item.disabled, !item.hidden,
          item.values.indices.contains(index) else { return }
    guard var values = controlled.value[id], values.indices.contains(index), values[index] != value else { return }
    values[index] = value
    var next = controlled.value
    next[id] = values
    controlled.change(next)
    onValueChange?(id, value, index, controlled.eventCount, controlled.revision)
  }

  func pick(_ id: String, value: String) {
    guard active, !disabled, let item = items[id], item.type == .picker, !item.disabled, !item.hidden,
          let option = items[value], option.parentId == id, option.type == .action,
          !option.disabled, !option.hidden else { return }
    var next = pickerControlled.value
    guard next[id] != value else { return }
    next[id] = value
    pickerControlled.change(next)
    onPickerChange?(id, value, pickerControlled.eventCount, pickerControlled.revision)
  }
}

@objcMembers
public final class OneNativeMenuView: UIView {
  public var onAction: ((String) -> Void)?
  public var onPrimaryAction: (() -> Void)?
  public var onValueChange: ((String, Bool, Int, Int, Int) -> Void)?
  public var onPickerChange: ((String, String, Int, Int) -> Void)?
  private var model = OneNativeMenuModel()
  private var controller: OneNativeHostingController<OneNativeMenuRoot>?
  private var contextMenu: UIContextMenuInteraction?

  public override init(frame: CGRect) { super.init(frame: frame) }
  required init?(coder: NSCoder) { fatalError("init(coder:) is unavailable") }

  public func mountTrigger(_ view: UIView) {
    precondition(model.trigger == nil, "Swift.Menu expects one RN trigger container")
    model.trigger = view
    setNeedsLayout()
  }

  public func unmountTrigger(_ view: UIView) {
    if model.trigger === view { model.trigger = nil }
    view.removeFromSuperview()
  }

  public func configureItems(_ items: [[String: Any]]) {
    let nodes = items.map(OneNativeMenuNode.init)
    model.items = Dictionary(uniqueKeysWithValues: nodes.map { ($0.id, $0) })
    model.propValues = Dictionary(uniqueKeysWithValues: nodes.filter { $0.type == .toggle }.map { ($0.id, $0.values) })
    model.propPickerValues = Dictionary(uniqueKeysWithValues: nodes.filter { $0.type == .picker }.map { ($0.id, $0.selection) })
    model.children = Dictionary(grouping: nodes, by: \\.parentId)
  }

  public func configure(
    ${configureParams.replaceAll('\n', '\n    ')}
  ) {
    if let next = model.controlled.applying(model.propValues, acknowledged: acknowledgedEvent, revision: revision) { model.controlled = next }
    if let next = model.pickerControlled.applying(model.propPickerValues, acknowledged: pickerAcknowledgedEvent, revision: revision) { model.pickerControlled = next }
    if model.label != triggerLabel { model.label = triggerLabel }
    if model.disabled != disabled { model.disabled = disabled; setNeedsLayout() }
    if model.hasPrimaryAction != hasPrimaryAction { model.hasPrimaryAction = hasPrimaryAction }
    if model.menuOrder != menuOrder { model.menuOrder = menuOrder }
    if model.menuActionDismissBehavior != menuActionDismissBehavior { model.menuActionDismissBehavior = menuActionDismissBehavior }
    if model.presentation != presentation { model.presentation = presentation; setNeedsLayout() }
  }

  public override func didMoveToWindow() {
    super.didMoveToWindow()
    updateHost()
  }

  public override func layoutSubviews() {
    super.layoutSubviews()
    if model.size != bounds.size { model.size = bounds.size }
    updateHost()
  }

  private func updateHost() {
    model.active = false
    guard window != nil else { controller?.detach(); return }
    if model.onAction == nil {
      model.onAction = { [weak self] id in self?.onAction?(id) }
      model.onPrimaryAction = { [weak self] in self?.onPrimaryAction?() }
      model.onValueChange = { [weak self] id, value, index, count, revision in self?.onValueChange?(id, value, index, count, revision) }
      model.onPickerChange = { [weak self] id, value, count, revision in self?.onPickerChange?(id, value, count, revision) }
    }
    // a context menu is the same UIContextMenuInteraction swiftui's contextMenu installs,
    // added to the host directly. a hosting controller per trigger costs every one of
    // them a child view controller and a swiftui graph on each window move, which a list
    // of rows pays on every tab or page switch. the trigger stays a plain subview, so the
    // react native subtree keeps its own touches and accessibility.
    if model.presentation == "contextMenu" {
      controller?.detach()
      controller = nil
      if let trigger = model.trigger {
        if trigger.superview !== self { addSubview(trigger) }
        trigger.frame = bounds
      }
      if contextMenu == nil {
        let interaction = UIContextMenuInteraction(delegate: self)
        addInteraction(interaction)
        contextMenu = interaction
      }
      // swiftui's disabled covers the subject of a context menu too: its touches and the menu
      isUserInteractionEnabled = !model.disabled
      model.active = true
      return
    }
    if let contextMenu {
      removeInteraction(contextMenu)
      self.contextMenu = nil
    }
    isUserInteractionEnabled = true
    if controller == nil {
      controller = OneNativeHostingController(rootView: OneNativeMenuRoot(model: model))
    }
    controller?.attach(to: self)
    model.active = controller?.isAttached == true
  }

  public func reset() {
    model.active = false
    model.onAction = nil
    model.onPrimaryAction = nil
    model.onValueChange = nil
    model.onPickerChange = nil
    model.trigger?.removeFromSuperview()
    controller?.detach()
    controller = nil
    model = OneNativeMenuModel()
  }
}

struct OneNativeMenuPicker: View {
  @ObservedObject var model: OneNativeMenuModel
  let item: OneNativeMenuNode

  var body: some View {
    Picker(selection: Binding(
      get: { model.pickerControlled.value[item.id] ?? item.selection },
      set: { model.pick(item.id, value: $0) }
    )) {
      ForEach(model.children[item.id] ?? []) { option in
        if !option.hidden {
          OneNativeMenuLabel(item: option)
            .tag(option.id)
            .disabled(option.disabled)
        }
      }
    } label: {
      OneNativeMenuLabel(item: item)
    }
    .pickerStyle(.menu)
  }
}

private struct OneNativeMenuRoot: View {
  @ObservedObject var model: OneNativeMenuModel
  var body: some View {
    if let trigger = model.trigger {
      // a menu owns the tap, which is why its trigger is passive.
      if model.hasPrimaryAction {
        Menu {
          OneNativeGeneratedMenuContent(model: model, parentId: "")
        } label: {
          menuLabel(trigger)
        } primaryAction: {
          model.primaryAction()
        }
        .menuStyle(.button)
        .buttonStyle(.plain)
        .disabled(model.disabled)
        .accessibilityLabel(model.label)
        .oneNativeMenuOrder(model.menuOrder)
        .oneNativeMenuActionDismissBehavior(model.menuActionDismissBehavior)
      } else {
        Menu {
          OneNativeGeneratedMenuContent(model: model, parentId: "")
        } label: {
          menuLabel(trigger)
        }
        .menuStyle(.button)
        .buttonStyle(.plain)
        .disabled(model.disabled)
        .accessibilityLabel(model.label)
        .oneNativeMenuOrder(model.menuOrder)
        .oneNativeMenuActionDismissBehavior(model.menuActionDismissBehavior)
      }
    }
  }

  private func menuLabel(_ trigger: UIView) -> some View {
    OneNativeSlot(content: trigger, mode: .passive)
      .frame(width: model.size.width, height: model.size.height)
      // Yoga owns the trigger frame, not the safe area.
      .position(x: model.size.width / 2, y: model.size.height / 2)
      .contentShape(Rectangle())
  }
}

extension OneNativeMenuView: UIContextMenuInteractionDelegate {
  public func contextMenuInteraction(
    _ interaction: UIContextMenuInteraction, configurationForMenuAtLocation location: CGPoint
  ) -> UIContextMenuConfiguration? {
    let configuration = UIContextMenuConfiguration(identifier: nil, previewProvider: nil) { [weak self] _ in
      guard let self else { return nil }
      return UIMenu(children: self.menuElements("", dismiss: self.model.menuActionDismissBehavior, disabled: false))
    }
    configuration.preferredMenuElementOrder = Self.menuOrder(model.menuOrder)
    return configuration
  }

  // the uikit form of OneNativeGeneratedMenuContent: a divider or a section closes the
  // run of items before it, the way uikit groups menu elements between separators.
  // dismiss behavior and disabled pass down to nested items, as swiftui's environment does.
  private func menuElements(_ parentId: String, dismiss: String, disabled: Bool) -> [UIMenuElement] {
    var groups: [UIMenuElement] = []
    var run: [UIMenuElement] = []
    func closeRun() {
      guard !run.isEmpty else { return }
      groups.append(UIMenu(options: .displayInline, children: run))
      run = []
    }
    for item in model.children[parentId] ?? [] where !item.hidden {
      let image = item.systemImage.isEmpty ? nil : UIImage(systemName: item.systemImage)
      let itemDismiss = item.menuActionDismissBehavior.isEmpty ? dismiss : item.menuActionDismissBehavior
      let itemDisabled = disabled || item.disabled
      switch item.type {
      case .action:
        let action = UIAction(title: item.title, image: image) { [weak self] _ in self?.model.action(item.id) }
        if item.role == "destructive" { action.attributes.insert(.destructive) }
        if itemDisabled { action.attributes.insert(.disabled) }
        if itemDismiss == "disabled" { action.attributes.insert(.keepsMenuPresented) }
        run.append(action)
      case .toggle:
        let values = (model.controlled.value[item.id] ?? []).prefix(item.values.count)
        let on = !values.isEmpty && values.allSatisfy { $0 }
        let state: UIMenuElement.State = on ? .on : values.contains(true) ? .mixed : .off
        let action = UIAction(title: item.title, image: image, state: state) { [weak self] _ in
          for index in item.values.indices { self?.model.changeValue(item.id, index: index, value: !on) }
        }
        if itemDisabled { action.attributes.insert(.disabled) }
        if itemDismiss == "disabled" { action.attributes.insert(.keepsMenuPresented) }
        run.append(action)
      case .submenu:
        let menu = UIMenu(title: item.title, image: image, children: menuElements(item.id, dismiss: itemDismiss, disabled: itemDisabled))
        run.append(menu)
      case .picker:
        // a menu-style Picker is a single-selection submenu whose chosen option carries the checkmark.
        let selected = model.pickerControlled.value[item.id] ?? item.selection
        let options: [UIMenuElement] = (model.children[item.id] ?? []).filter { !$0.hidden }.map { option in
          let optionImage = option.systemImage.isEmpty ? nil : UIImage(systemName: option.systemImage)
          let action = UIAction(title: option.title, image: optionImage, state: option.id == selected ? .on : .off) { [weak self] _ in
            self?.model.pick(item.id, value: option.id)
          }
          if itemDisabled || option.disabled { action.attributes.insert(.disabled) }
          return action
        }
        run.append(UIMenu(title: item.title, image: image, options: .singleSelection, children: options))
      case .section:
        closeRun()
        groups.append(UIMenu(title: item.title, options: .displayInline, children: menuElements(item.id, dismiss: itemDismiss, disabled: itemDisabled)))
      case .controlGroup:
        closeRun()
        groups.append(controlGroup(item, image: image, dismiss: itemDismiss, disabled: itemDisabled))
      case .divider:
        closeRun()
      }
    }
    // items with no divider or section among them stay flat, as swiftui builds them: an
    // extra inline menu around a section's items hides the section's header.
    if groups.isEmpty { return run }
    closeRun()
    return groups
  }

  // swiftui draws a ControlGroup inside a menu as an inline row of its controls.
  private func controlGroup(_ item: OneNativeMenuNode, image: UIImage?, dismiss: String, disabled: Bool) -> UIMenuElement {
    let children = menuElements(item.id, dismiss: dismiss, disabled: disabled)
    switch item.controlGroupStyle {
    case "palette":
      return UIMenu(title: item.title, image: image, options: [.displayInline, .displayAsPalette], children: children)
    case "menu":
      return UIMenu(title: item.title, image: image, children: children)
    case "compactMenu":
      let menu = UIMenu(title: item.title, image: image, options: .displayInline, children: children)
      menu.preferredElementSize = .small
      return menu
    default:
      let menu = UIMenu(title: item.title, image: image, options: .displayInline, children: children)
      menu.preferredElementSize = .medium
      return menu
    }
  }

  private static func menuOrder(_ value: String) -> UIContextMenuConfiguration.ElementOrder {
    switch value {
    case "priority": return .priority
    case "fixed": return .fixed
    default: return .automatic
    }
  }
}
`
  )
  outputs.set(
    'ios/Generated/OneNativeMenuComponentView.h',
    `${header}#ifdef __cplusplus
#import <React/RCTViewComponentView.h>

NS_ASSUME_NONNULL_BEGIN
@interface OneNativeMenuComponentView : RCTViewComponentView
@end
NS_ASSUME_NONNULL_END
#endif
`
  )
  outputs.set(
    'ios/Generated/OneNativeMenuComponentView.mm',
    `${header}#import "OneNativeMenuComponentView.h"
#import <React/RCTView.h>
#import "One-Swift.h"
#import "Generated/OneNativeMenuPayload.h"
#import <react/renderer/components/OneNativeSpec/ComponentDescriptors.h>
#import <react/renderer/components/OneNativeSpec/EventEmitters.h>
#import <react/renderer/components/OneNativeSpec/Props.h>
#import <React/RCTConversions.h>

using namespace facebook::react;

@implementation OneNativeMenuComponentView {
  OneNativeMenuView *_menuView;
  BOOL _itemsDirty;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider
{
  return concreteComponentDescriptorProvider<OneNativeMenuComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame
{
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const OneNativeMenuProps>();
    _itemsDirty = YES;
    _menuView = [OneNativeMenuView new];
    self.contentView = _menuView;
    __weak OneNativeMenuComponentView *weakSelf = self;
    _menuView.onAction = ^(NSString *identifier) {
      OneNativeMenuComponentView *strongSelf = weakSelf;
      if (!strongSelf || !strongSelf->_eventEmitter) return;
      auto emitter = std::static_pointer_cast<const OneNativeMenuEventEmitter>(strongSelf->_eventEmitter);
      emitter->onNativeMenuAction({.id = std::string(identifier.UTF8String)});
    };
    _menuView.onPrimaryAction = ^{
      OneNativeMenuComponentView *strongSelf = weakSelf;
      if (!strongSelf || !strongSelf->_eventEmitter) return;
      auto emitter = std::static_pointer_cast<const OneNativeMenuEventEmitter>(strongSelf->_eventEmitter);
      emitter->onNativeMenuPrimaryAction({.kind = std::string("primary")});
    };
    _menuView.onValueChange = ^(NSString *identifier, BOOL value, NSInteger sourceIndex, NSInteger eventCount, NSInteger revision) {
      OneNativeMenuComponentView *strongSelf = weakSelf;
      if (!strongSelf || !strongSelf->_eventEmitter) return;
      auto emitter = std::static_pointer_cast<const OneNativeMenuEventEmitter>(strongSelf->_eventEmitter);
      emitter->onNativeMenuValueChange({.id = std::string(identifier.UTF8String), .value = (bool)value, .sourceIndex = (int)sourceIndex, .eventCount = (int)eventCount, .revision = (int)revision});
    };
    _menuView.onPickerChange = ^(NSString *identifier, NSString *value, NSInteger eventCount, NSInteger revision) {
      OneNativeMenuComponentView *strongSelf = weakSelf;
      if (!strongSelf || !strongSelf->_eventEmitter) return;
      auto emitter = std::static_pointer_cast<const OneNativeMenuEventEmitter>(strongSelf->_eventEmitter);
      emitter->onNativeMenuPickerChange({.id = std::string(identifier.UTF8String), .value = std::string(value.UTF8String), .eventCount = (int)eventCount, .revision = (int)revision});
    };
  }
  return self;
}

- (void)mountChildComponentView:(UIView<RCTComponentViewProtocol> *)child index:(NSInteger)index
{
  [_menuView mountTrigger:child];
}

- (void)unmountChildComponentView:(UIView<RCTComponentViewProtocol> *)child index:(NSInteger)index
{
  [_menuView unmountTrigger:child];
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps
{
  const auto &next = *std::static_pointer_cast<const OneNativeMenuProps>(props);
  const auto &previous = *std::static_pointer_cast<const OneNativeMenuProps>(_props);
  if (_itemsDirty || !OneNativeMenuItemsEqual(previous.items, next.items)) {
    [_menuView configureItems:OneNativeMenuPayload(next.items)];
    _itemsDirty = NO;
  }
  [_menuView ${configureFirst}
${configureRest.map((line) => `              ${line}`).join('\n')}];
  [super updateProps:props oldProps:oldProps];
}

- (void)updateLayoutMetrics:(const LayoutMetrics &)layoutMetrics oldLayoutMetrics:(const LayoutMetrics &)oldLayoutMetrics
{
  [super updateLayoutMetrics:layoutMetrics oldLayoutMetrics:oldLayoutMetrics];
  // the representable shares the fabric parent's coordinates; yoga owns the trigger frame.
  _menuView.frame = self.bounds;
}

- (void)prepareForRecycle
{
  [super prepareForRecycle];
  [_menuView reset];
  _itemsDirty = YES;
}

@end
`
  )
}
