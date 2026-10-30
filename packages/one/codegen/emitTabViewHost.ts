import { components, tabViewHost } from './catalog'
import { containerComponents, contentComponents } from './emitContainers'
import {
  available,
  ios,
  present,
  selectConstructor,
  selectModifier,
  type Declaration,
} from './inventory'

type TabViewSpec = {
  name: string
  props: Record<string, string>
  events: Record<string, Record<string, string>>
  swiftStyle?: boolean
  enumProps?: Record<string, string>
  controlled?: { value: string; event: string }
  slots?: readonly {
    name: string
    content: string
    cardinality: string
    key?: string
    layout: string
  }[]
  interfaceOnly?: boolean
}

const containerRows = () =>
  [...containerComponents, ...contentComponents] as unknown as readonly TabViewSpec[]

const tabRows = () => components as unknown as readonly TabViewSpec[]

const signature = (parameters: readonly { label: string; type: string }[]) =>
  JSON.stringify(parameters.map((parameter) => [parameter.label, parameter.type]))

const normalizeReqs = (requirements: readonly string[]) =>
  JSON.stringify(requirements.map((value) => value.replace(/\s+/g, '')).sort())

const ownerName = (declaration: Declaration) => declaration.owner.split('.').at(-1)

// the legacy TabView path calls SDK surface Apple deprecated but still ships.
// selection follows present(), not available(): a deprecated initializer the
// SDK still ships keeps resolving, while a removed one fails before output.
// signatures and requirements still match exactly, so nothing silently rebinds.
function selectPresentConstructor(
  inventory: readonly Declaration[],
  selector: { type: string; parameters: readonly { label: string; type: string }[] }
) {
  const wanted = signature(selector.parameters)
  const matches = inventory.filter(
    (declaration) =>
      declaration.kind === 'init' &&
      ownerName(declaration) === selector.type &&
      present(declaration) &&
      signature(declaration.parameters) === wanted
  )
  const shown = `${selector.type}(${selector.parameters.map((parameter) => `${parameter.label}: ${parameter.type}`).join(', ')})`
  if (matches.length === 1) return matches[0]
  if (!matches.length) throw new Error(`SDK constructor signature changed: ${shown}`)
  throw new Error(`ambiguous SDK constructor: ${shown}`)
}

function selectPresentModifier(
  inventory: readonly Declaration[],
  selector: {
    name: string
    parameters: readonly { label: string; type: string }[]
    requirements: readonly string[]
  }
) {
  const matches = inventory.filter(
    (declaration) =>
      declaration.kind === 'func' &&
      ownerName(declaration) === 'View' &&
      declaration.name === selector.name &&
      present(declaration) &&
      signature(declaration.parameters) === signature(selector.parameters) &&
      normalizeReqs(declaration.requirements ?? []) === normalizeReqs(selector.requirements)
  )
  if (matches.length === 1) return matches[0]
  throw new Error(
    `SDK modifier ${selector.name}: expected one exact match, found ${matches.length}`
  )
}

// a TabContent method: the owner is the protocol, not View, and two overloads
// can share labels, so requirements match exactly like selectModifier.
function selectTabContentMethod(
  inventory: readonly Declaration[],
  selector: {
    name: string
    parameters: readonly { label: string; type: string }[]
    requirements: readonly string[]
  }
) {
  const matches = inventory.filter(
    (declaration) =>
      declaration.kind === 'func' &&
      ownerName(declaration) === 'TabContent' &&
      declaration.name === selector.name &&
      available(declaration) &&
      signature(declaration.parameters) === signature(selector.parameters) &&
      normalizeReqs(declaration.requirements ?? []) === normalizeReqs(selector.requirements)
  )
  if (matches.length === 1) return matches[0]
  throw new Error(
    `SDK TabContent ${selector.name}: expected one exact match, found ${matches.length}`
  )
}

// a TabSection initializer: two overloads share the String signature and
// differ only in requirements, so those match exactly too.
function selectSectionConstructor(
  inventory: readonly Declaration[],
  selector: {
    type: string
    parameters: readonly { label: string; type: string }[]
    requirements: readonly string[]
  }
) {
  const matches = inventory.filter(
    (declaration) =>
      declaration.kind === 'init' &&
      ownerName(declaration) === selector.type &&
      available(declaration) &&
      signature(declaration.parameters) === signature(selector.parameters) &&
      normalizeReqs(declaration.requirements ?? []) === normalizeReqs(selector.requirements)
  )
  const shown = `${selector.type}(${selector.parameters.map((parameter) => `${parameter.label}: ${parameter.type}`).join(', ')})`
  if (matches.length === 1) return matches[0]
  if (!matches.length) throw new Error(`SDK constructor signature changed: ${shown}`)
  throw new Error(`ambiguous SDK constructor: ${shown}`)
}

// UIKit ships no scanned inventory, so the tab bar controller interception
// stays explicit semantic mapping: the two delegate methods the interceptor
// implements and the scroll view naming it performs. the tests pin each
// fragment to the emitted Swift.
export const tabBarInterception = [
  'func tabBarController(_ controller: UITabBarController, shouldSelectTab tab: UITab) -> Bool',
  'func tabBarController(_ controller: UITabBarController, shouldSelect viewController: UIViewController) -> Bool',
  'current.setContentScrollView(scrollView, for: .bottom)',
  'current.contentScrollView(for: .bottom)',
] as const

const sdkEvent = { name: 'string', value: 'string' }

// the SDK facts the tab view hosts emit against: the modern and legacy
// TabView initializers, the String TabSection initializer, the
// TabViewCustomization Codable round-trip, the tabView and bar-visibility
// View modifiers, every TabContent method the tabs call, the four label
// styles, and the toolbar, accessory, and container placements, plus the
// exact spec surface of the TabView and its Tab. each entry carries the
// exact SDK version its call site gates on, so drift in either direction
// fails instead of emitting stale calls.
export function validateTabViewHost(
  inventory: readonly Declaration[],
  floor: number,
  ceiling: number,
  containers: readonly TabViewSpec[] = containerRows(),
  tabs: readonly TabViewSpec[] = tabRows()
) {
  const fail = (message: string): never => {
    throw new Error(`OneNativeTabView host: ${message}`)
  }
  const checkVersion = (
    declaration: Declaration,
    shown: string,
    expected: number,
    gatedFloor: boolean
  ) => {
    if (ios(declaration) > ceiling)
      fail(`${shown} needs iOS ${ios(declaration)}, past the ceiling ${ceiling}`)
    if (ios(declaration) !== expected)
      fail(`${shown} ships iOS ${ios(declaration)}, not the ${expected} the host gates on`)
    if (gatedFloor && ios(declaration) > floor)
      fail(`${shown} needs iOS ${ios(declaration)}, past the floor ${floor}`)
  }
  const view = selectConstructor(inventory, tabViewHost.view)
  checkVersion(view, 'TabView(selection:content:)', tabViewHost.view.ios, false)
  const legacy = selectPresentConstructor(inventory, tabViewHost.legacyView)
  checkVersion(legacy, 'TabView(selection:content:)', tabViewHost.legacyView.ios, true)
  const section = selectSectionConstructor(inventory, tabViewHost.section)
  checkVersion(section, 'TabSection(_:content:)', tabViewHost.section.ios, false)
  const customization = inventory.filter(
    (declaration) =>
      declaration.kind === 'struct' &&
      declaration.name === tabViewHost.customization.type &&
      present(declaration) &&
      ios(declaration) <= ceiling
  )
  if (customization.length !== 1)
    fail(`${tabViewHost.customization.type} has ${customization.length} struct spellings`)
  checkVersion(customization[0], tabViewHost.customization.type, tabViewHost.customization.ios, false)
  const defaultInit = inventory.filter(
    (declaration) =>
      declaration.kind === 'init' &&
      ownerName(declaration) === tabViewHost.customization.type &&
      available(declaration) &&
      declaration.parameters.length === 0
  )
  if (defaultInit.length !== 1)
    fail(`${tabViewHost.customization.type}() has ${defaultInit.length} initializers`)
  checkVersion(defaultInit[0], `${tabViewHost.customization.type}()`, tabViewHost.customization.ios, false)
  const encode = inventory.filter(
    (declaration) =>
      declaration.kind === 'func' &&
      ownerName(declaration) === tabViewHost.customization.type &&
      available(declaration) &&
      declaration.name === tabViewHost.customization.encode.name &&
      signature(declaration.parameters) ===
        signature(tabViewHost.customization.encode.parameters)
  )
  if (encode.length !== 1)
    fail(`${tabViewHost.customization.type} has ${encode.length} encoders`)
  checkVersion(encode[0], `${tabViewHost.customization.type} encode`, tabViewHost.customization.ios, false)
  const decode = inventory.filter(
    (declaration) =>
      declaration.kind === 'init' &&
      ownerName(declaration) === tabViewHost.customization.type &&
      available(declaration) &&
      signature(declaration.parameters) ===
        signature(tabViewHost.customization.decode.parameters)
  )
  if (decode.length !== 1)
    fail(`${tabViewHost.customization.type} has ${decode.length} decoders`)
  checkVersion(decode[0], `${tabViewHost.customization.type} decode`, tabViewHost.customization.ios, false)
  for (const modifier of tabViewHost.modifiers) {
    const declaration = selectModifier(inventory, modifier)
    checkVersion(
      declaration,
      modifier.name,
      modifier.ios,
      'floor' in modifier && modifier.floor === true
    )
  }
  for (const modifier of tabViewHost.legacyModifiers) {
    const declaration = selectPresentModifier(inventory, modifier)
    checkVersion(declaration, modifier.name, modifier.ios, true)
  }
  for (const method of tabViewHost.tabContent) {
    const declaration = selectTabContentMethod(inventory, method)
    checkVersion(declaration, `TabContent.${method.name}`, method.ios, false)
  }
  for (const style of tabViewHost.labelStyles) {
    const members = inventory.filter(
      (declaration) =>
        declaration.kind === 'static' &&
        declaration.owner === 'SwiftUI.LabelStyle' &&
        declaration.name === style.member &&
        declaration.parameters.length === 0 &&
        declaration.requirements?.length === 1 &&
        declaration.requirements[0] === `Self == ${style.type}` &&
        declaration.type === style.type &&
        present(declaration) &&
        ios(declaration) <= ceiling
    )
    if (members.length !== 1)
      fail(`LabelStyle has ${members.length} members spelling .${style.member}`)
    checkVersion(members[0], `LabelStyle.${style.member}`, style.ios, true)
  }
  const member = (owner: string, name: string, type: string, shown: string) => {
    const matches = inventory.filter(
      (declaration) =>
        declaration.kind === 'static' &&
        ownerName(declaration) === owner &&
        declaration.name === name &&
        declaration.parameters.length === 0 &&
        declaration.type === type &&
        present(declaration) &&
        ios(declaration) <= ceiling
    )
    if (matches.length !== 1) fail(`${shown} has ${matches.length} members spelling .${name}`)
    return matches[0]
  }
  checkVersion(
    member(
      tabViewHost.placements.tabBar.owner,
      tabViewHost.placements.tabBar.member,
      tabViewHost.placements.tabBar.type,
      'ToolbarPlacement'
    ),
    'ToolbarPlacement.tabBar',
    tabViewHost.placements.tabBar.ios,
    true
  )
  checkVersion(
    member(
      tabViewHost.placements.navigation.owner,
      tabViewHost.placements.navigation.member,
      tabViewHost.placements.navigation.type,
      'ContainerBackgroundPlacement'
    ),
    'ContainerBackgroundPlacement.navigation',
    tabViewHost.placements.navigation.ios,
    false
  )
  for (const name of tabViewHost.placements.accessory.members) {
    checkVersion(
      member(
        tabViewHost.placements.accessory.owner,
        name,
        tabViewHost.placements.accessory.type,
        'TabViewBottomAccessoryPlacement'
      ),
      `TabViewBottomAccessoryPlacement.${name}`,
      tabViewHost.placements.accessory.ios,
      false
    )
  }
  const environment = inventory.filter(
    (declaration) =>
      declaration.kind === 'var' &&
      declaration.owner === tabViewHost.placements.accessoryEnvironment.owner &&
      declaration.name === tabViewHost.placements.accessoryEnvironment.name &&
      declaration.type === tabViewHost.placements.accessoryEnvironment.type &&
      present(declaration) &&
      ios(declaration) <= ceiling
  )
  if (environment.length !== 1)
    fail(`EnvironmentValues has ${environment.length} tabViewBottomAccessoryPlacement keys`)
  checkVersion(
    environment[0],
    'tabViewBottomAccessoryPlacement',
    tabViewHost.placements.accessoryEnvironment.ios,
    false
  )
  const row = (name: string) =>
    containers.find((entry) => entry.name === name) ?? fail(`components name no ${name}`)
  const tabView = row('OneNativeTabView')
  for (const { prop, type } of [...tabViewHost.configure, ...tabViewHost.selection]) {
    if (!(prop in tabView.props)) fail(`configure prop ${prop} is not in the spec`)
    if (tabView.props[prop] !== type)
      fail(`configure prop ${prop} carries ${tabView.props[prop]}, not the ${type} the model reads`)
  }
  if (tabView.swiftStyle !== true) fail('OneNativeTabView styles through swiftStyle')
  const tabViewEvents: Record<string, Record<string, string>> = {
    onNativeTabViewSelectionChange: { selection: 'string', eventCount: 'Int32', revision: 'Int32' },
    onNativeTabViewAction: { tabId: 'string' },
    onNativeTabViewCustomizationChange: { customization: 'string' },
    onNativeSDKEvent: { name: 'string', value: 'string' },
  }
  for (const [event, fields] of Object.entries(tabViewEvents)) {
    const declared = tabView.events[event] ?? fail(`event ${event} is not in the spec`)
    if (JSON.stringify(declared) !== JSON.stringify(fields))
      fail(`${event} must carry ${Object.keys(fields).join(', ')}`)
  }
  if (
    JSON.stringify(tabView.enumProps ?? null) !==
    JSON.stringify({ tabViewStyle: 'TabViewStyle', tabBarVisibility: 'Visibility' })
  )
    fail('OneNativeTabView maps tabViewStyle and tabBarVisibility to the tab enums')
  if (
    JSON.stringify(tabView.controlled ?? null) !==
    JSON.stringify({ value: 'selection', event: 'onNativeTabViewSelectionChange' })
  )
    fail('OneNativeTabView controls selection through onNativeTabViewSelectionChange')
  const pages = (tabView.slots ?? []).find((slot) => slot.name === 'pages')
  if (
    !pages ||
    pages.content !== 'OneNativeTab' ||
    pages.cardinality !== 'many' ||
    pages.key !== 'tabId' ||
    pages.layout !== 'swiftui'
  )
    fail('OneNativeTabView carries many OneNativeTab pages keyed by tabId')
  const tab = tabs.find((entry) => entry.name === tabViewHost.tab.component) ??
    fail(`components name no ${tabViewHost.tab.component}`)
  for (const arg of tabViewHost.tab.args) {
    if (!(arg.prop in tab.props)) fail(`item prop ${arg.prop} is not in the spec`)
    if (tab.props[arg.prop] !== arg.type)
      fail(`item prop ${arg.prop} carries ${tab.props[arg.prop]}, not the ${arg.type} the item reads`)
  }
  if (tabViewHost.tab.style !== (tab.swiftStyle === true))
    fail('OneNativeTab styles through swiftStyle')
  const reports = 'onNativeSDKEvent' in tab.events
  if (tabViewHost.tab.sdkEvent !== reports) fail('OneNativeTab reports SDK events up')
  if (reports && JSON.stringify(tab.events.onNativeSDKEvent) !== JSON.stringify(sdkEvent))
    fail('OneNativeTab must carry the SDK event')
  if (JSON.stringify(tab.enumProps ?? null) !== JSON.stringify({ tabRole: 'TabRole' }))
    fail('OneNativeTab maps tabRole to TabRole')
  if (tab.interfaceOnly !== true) fail('OneNativeTab stays interface-only')
  const content = (tab.slots ?? []).find((slot) => slot.name === 'content')
  if (
    !content ||
    content.content !== 'react-native' ||
    content.cardinality !== 'many' ||
    content.layout !== 'swiftui-proposal-to-yoga'
  )
    fail('OneNativeTab carries React Native content SwiftUI proposes')
}

const tabViewSwift = `import SwiftUI
import UIKit

struct OneNativePlacedValue: Decodable, Equatable {
  let value: String
  let placements: [String]
}

struct OneNativeSectionAction: Decodable, Equatable, Identifiable {
  let id: String
  let title: String
  let systemImage: String
}

// the TabContent modifiers a Tab or TabSection carries, decoded from the JSON the React side
// validated against the SDK. an absent field leaves SwiftUI's own default in place.
struct OneNativeTabModifiers: Decodable, Equatable {
  var image: String?
  var labelStyle: String?
  var navigationStack: Bool?
  var section: String?
  var disabled: Bool?
  var hidden: Bool?
  var customizationID: String?
  var customizationBehavior: OneNativePlacedValue?
  var defaultVisibility: OneNativePlacedValue?
  var springLoadingBehavior: String?
  var tabPlacement: String?
  var defaultSectionExpansion: String?
  var sectionActions: [OneNativeSectionAction]?
  var accessibilityLabel: String?
  var accessibilityHint: String?
  var accessibilityValue: String?
  var accessibilityIdentifier: String?
  var help: String?
}

extension OneNativeTabModifiers {
  init(json: String) {
    do { self = try JSONDecoder().decode(Self.self, from: Data(json.utf8)) }
    catch { preconditionFailure("invalid Swift.Tab modifiers \\(json): \\(error)") }
  }
}

@objcMembers
public final class OneNativeTabItem: NSObject, Identifiable {
  public let id: String
  // page, action, section, accessoryInline, accessoryExpanded or slot.
  public var kind: String
  public var title: String
  public var systemImage: String
  public var badge: String
  public var role: String
  public var slotHeight: CGFloat
  var modifiers: OneNativeTabModifiers
  // View modifiers on the page's content, and where their SDK events go.
  var style = OneNativeStyle()
  public var emit: (String, String) -> Void = { _, _ in }
  public let view: UIView
  public let onLayout: (CGRect) -> Void

  public init(id: String, kind: String, title: String, systemImage: String, badge: String, role: String, slotHeight: CGFloat, tabModifiers: String, view: UIView, onLayout: @escaping (CGRect) -> Void) {
    self.id = id
    self.kind = kind
    self.title = title
    self.systemImage = systemImage
    self.badge = badge
    self.role = role
    self.slotHeight = slotHeight
    self.modifiers = OneNativeTabModifiers(json: tabModifiers)
    self.view = view
    self.onLayout = onLayout
  }

  public func configureStyle(_ style: [String: Any]) {
    self.style = OneNativeStyle(dictionary: style)
  }
}

// a TabView entry: one tab, or a section with the tabs that name it.
private struct TabGroup: Identifiable {
  let id: String
  let section: OneNativeTabItem?
  var tabs: [OneNativeTabItem]
}

// an action tab is a button wearing a tab's chrome. UIKit asks before it selects a tab, so the
// press fires there and the selected page never changes. UIKit also asks when the selected tab
// is tapped again, which SwiftUI's selection binding never reports, so that tap is a press of
// the page and goes on to SwiftUI's own delegate. every other delegate call reaches SwiftUI's
// delegate unchanged.
private final class ActionTabDelegate: NSObject, UITabBarControllerDelegate {
  weak var original: UITabBarControllerDelegate?
  weak var model: TabViewModel?

  override func responds(to selector: Selector!) -> Bool {
    super.responds(to: selector) || (original?.responds(to: selector) ?? false)
  }

  override func forwardingTarget(for selector: Selector!) -> Any? {
    original?.responds(to: selector) == true ? original : nil
  }

  @available(iOS 18.0, *)
  func tabBarController(_ controller: UITabBarController, shouldSelectTab tab: UITab) -> Bool {
    if let model, model.active, let page = model.topLevelPage(tab, in: controller) {
      if page.kind == "action" {
        model.press(page.id)
        return false
      }
      if controller.selectedTab === tab { model.press(page.id) }
    }
    return original?.tabBarController?(controller, shouldSelectTab: tab) ?? true
  }

  // before iOS 18 the tab bar selects view controllers, one per tab in the flat order.
  func tabBarController(_ controller: UITabBarController, shouldSelect viewController: UIViewController) -> Bool {
    if #unavailable(iOS 18.0), let model, model.active,
      let index = controller.viewControllers?.firstIndex(of: viewController)
    {
      let tabs = model.groups.flatMap(\\.tabs)
      if tabs.indices.contains(index), tabs[index].kind == "action" {
        model.press(tabs[index].id)
        return false
      }
      if tabs.indices.contains(index), controller.selectedViewController === viewController {
        model.press(tabs[index].id)
      }
    }
    return original?.tabBarController?(controller, shouldSelect: viewController) ?? true
  }
}

private struct ActionTabHook: UIViewRepresentable {
  weak var host: OneNativeTabViewView?
  let page: UIView

  func makeUIView(context: Context) -> HookView { HookView() }
  func updateUIView(_ view: HookView, context: Context) {
    view.host = host
    view.page = page
    host?.track(view)
    view.report()
  }

  final class HookView: UIView {
    weak var host: OneNativeTabViewView?
    weak var page: UIView?

    override func didMoveToWindow() {
      super.didMoveToWindow()
      report()
    }

    func report() {
      guard window != nil else { return }
      let owner = sequence(first: self as UIResponder, next: \\.next).first { $0 is UIViewController }
      if let controller = owner as? UIViewController, let tabBarController = controller.tabBarController {
        host?.interceptActionTabs(tabBarController)
        if let page { nameContentScrollView(of: page, from: controller, in: tabBarController) }
      }
    }
  }
}

// the tab bar minimizes for the scroll view the selected controller names for the bottom edge.
// SwiftUI names the ScrollViews it draws itself, but a React Native ScrollView is a UIScrollView
// inside a representable it cannot see, so the page's first scroll view is named on every
// controller from the page's root up to the tab bar controller.
private func nameContentScrollView(of page: UIView, from controller: UIViewController, in tabBarController: UITabBarController) {
  guard let scrollView = firstScrollView(in: page) else { return }
  var next: UIViewController? = controller
  while let current = next, current !== tabBarController {
    if current.contentScrollView(for: .bottom) !== scrollView { current.setContentScrollView(scrollView, for: .bottom) }
    next = current.parent
  }
}

private func firstScrollView(in view: UIView) -> UIScrollView? {
  for child in view.subviews {
    if let scrollView = child as? UIScrollView, !(scrollView is UITextView) { return scrollView }
    if let scrollView = firstScrollView(in: child) { return scrollView }
  }
  return nil
}

private final class TabViewModel: ObservableObject {
  @Published var pages: [OneNativeTabItem] = []
  @Published var toolbarEntries: [OneNativeToolbarEntry] = []
  @Published var controlled = OneNativeControlled("")
  @Published var tabViewStyle = "automatic"
  @Published var tabBarVisibility = "automatic"
  @Published var customizable = false
  @Published var bottomAccessoryEnabled = true
  @Published var swiftStyle = OneNativeStyle()
  // TabViewCustomization's JSON, the form React holds and persists. the decoded value lives
  // beside it so the binding does not decode on every read.
  @Published var customizationJSON = ""
  var customization: Any?
  var active = false
  var onSelection: ((String, Int, Int) -> Void)?
  var onAction: ((String) -> Void)?
  var onCustomization: ((String) -> Void)?
  var onSDKEvent: ((String, String) -> Void)?

  func select(_ id: String) {
    guard active, pages.contains(where: { $0.id == id && $0.kind != "action" }) else { return }
    guard controlled.value != id else { return }
    controlled.change(id)
    onSelection?(id, controlled.eventCount, controlled.revision)
  }

  func press(_ id: String) {
    if active { onAction?(id) }
  }

  // the TabView's top level in order: each section is one entry, each tab outside one another.
  var groups: [TabGroup] {
    var groups: [TabGroup] = []
    for page in pages {
      switch page.kind {
      case "section":
        groups.append(TabGroup(id: page.id, section: page, tabs: []))
      case "page", "action":
        if let section = page.modifiers.section, let index = groups.firstIndex(where: { $0.id == section }) {
          groups[index].tabs.append(page)
        } else {
          groups.append(TabGroup(id: page.id, section: nil, tabs: [page]))
        }
      default: continue
      }
    }
    return groups
  }

  // SwiftUI names its UITabs itself, so a tab is found by its place in the tab bar's top level.
  @available(iOS 18.0, *)
  func topLevelPage(_ tab: UITab, in controller: UITabBarController) -> OneNativeTabItem? {
    guard let index = controller.tabs.firstIndex(where: { $0 === tab }) else { return nil }
    let groups = groups
    guard groups.indices.contains(index), groups[index].section == nil else { return nil }
    return groups[index].tabs.first
  }

  func emitSDKEvent(_ name: String, _ value: String) {
    if active { onSDKEvent?(name, value) }
  }

  @available(iOS 18.0, *)
  var customizationBinding: Binding<TabViewCustomization> {
    Binding(
      get: { [self] in (customization as? TabViewCustomization) ?? TabViewCustomization() },
      set: { [self] next in
        customization = next
        do {
          let json = String(decoding: try JSONEncoder().encode(next), as: UTF8.self)
          guard json != customizationJSON else { return }
          customizationJSON = json
          if active { onCustomization?(json) }
        } catch { preconditionFailure("TabViewCustomization failed to encode: \\(error)") }
      })
  }

  func applyCustomization(_ json: String) {
    guard json != customizationJSON else { return }
    customizationJSON = json
    guard #available(iOS 18.0, *) else { return }
    if json.isEmpty { customization = TabViewCustomization(); return }
    do { customization = try JSONDecoder().decode(TabViewCustomization.self, from: Data(json.utf8)) }
    catch { preconditionFailure("Swift.TabView customization is not a TabViewCustomization: \\(error)") }
  }
}

@objcMembers
public final class OneNativeTabViewView: UIView, OneNativeToolbarHost {
  public var onSelection: ((String, Int, Int) -> Void)?
  public var onAction: ((String) -> Void)?
  public var onCustomization: ((String) -> Void)?
  public var onSDKEvent: ((String, String) -> Void)?
  private var model = TabViewModel()
  private var controller: OneNativeHostingController<TabViewContent>?
  private let actionDelegate = ActionTabDelegate()
  private weak var tabBarController: UITabBarController?
  private var toolbars: [OneNativeToolbarView] = []
  private var hooks = NSHashTable<ActionTabHook.HookView>.weakObjects()
  private var active = false

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

  // keep keyed page identities stable so swiftUI reconciles inserted, removed and reordered tabs
  // against their content instead of reusing the page at the same array position. the TabView is
  // never rebuilt for them: a rebuild re-hosts every page under a new controller while a child
  // view controller inside the page (react-native-pager-view) keeps the old parent, and UIKit
  // aborts with UIViewControllerHierarchyInconsistency.
  public func setPages(_ pages: [OneNativeTabItem]) {
    let mounted = Dictionary(uniqueKeysWithValues: model.pages.map { ($0.id, $0) })
    let disabledChanged = pages.contains { page in
      mounted[page.id].map { $0.modifiers.disabled != page.modifiers.disabled } ?? false
    }
    model.pages = pages.map { page in
      guard let current = mounted[page.id], current.view === page.view else { return page }
      current.kind = page.kind
      current.title = page.title
      current.systemImage = page.systemImage
      current.badge = page.badge
      current.role = page.role
      current.slotHeight = page.slotHeight
      current.modifiers = page.modifiers
      current.style = page.style
      current.emit = page.emit
      return current
    }
    // swiftUI applies the change on its next update, so the redraw waits a turn for it.
    if disabledChanged { DispatchQueue.main.async { [weak self] in self?.redrawTabBarItems() } }
  }

  // UIKit sets a tab bar item's isEnabled without redrawing the item, so a tab disabled after
  // mount stops taking taps while it still looks enabled. any other item change redraws it: the
  // badge goes away and back in one turn, which draws nothing in between.
  private func redrawTabBarItems() {
    for item in tabBarController?.tabBar.items ?? [] {
      let badge = item.badgeValue
      item.badgeValue = badge == nil ? "" : nil
      item.badgeValue = badge
    }
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

  public func setSelection(_ selection: String, acknowledgedEvent: Int, revision: Int) {
    if let next = model.controlled.applying(selection, acknowledged: acknowledgedEvent, revision: revision) { model.controlled = next }
  }

  public func configure(tabViewStyle: String, tabBarVisibility: String, customization: String, customizable: Bool, bottomAccessoryEnabled: Bool) {
    if model.tabViewStyle != tabViewStyle { model.tabViewStyle = tabViewStyle }
    if model.tabBarVisibility != tabBarVisibility { model.tabBarVisibility = tabBarVisibility }
    if model.customizable != customizable { model.customizable = customizable }
    if model.bottomAccessoryEnabled != bottomAccessoryEnabled { model.bottomAccessoryEnabled = bottomAccessoryEnabled }
    model.applyCustomization(customization)
  }

  public func configureStyle(_ style: [String: Any]) {
    let next = OneNativeStyle(dictionary: style)
    if model.swiftStyle != next { model.swiftStyle = next }
  }

  public override func didMoveToWindow() {
    super.didMoveToWindow()
    if window == nil { detachController() }
    else { attachController() }
  }

  public override func layoutSubviews() {
    super.layoutSubviews()
    attachController()
    controller?.view.frame = bounds
  }

  fileprivate func track(_ hook: ActionTabHook.HookView) { hooks.add(hook) }

  // a page mounted or unmounted a child, so its scroll view may be new.
  public func pageContentChanged() {
    for hook in hooks.allObjects { hook.report() }
  }

  // SwiftUI builds its tab bar controller after the first layout and can replace its delegate,
  // so each page's hook reports the controller once it is in the window and the interceptor goes
  // back in front of whatever SwiftUI installed.
  func interceptActionTabs(_ tabBarController: UITabBarController) {
    self.tabBarController = tabBarController
    // swiftui's tab controller and page host each paint a system background outside
    // the navigation container. keep those containers clear so the page owns the paint.
    tabBarController.view.backgroundColor = .clear
    tabBarController.selectedViewController?.viewIfLoaded?.backgroundColor = .clear
    guard tabBarController.delegate !== actionDelegate else { return }
    actionDelegate.original = tabBarController.delegate
    actionDelegate.model = model
    tabBarController.delegate = actionDelegate
  }

  private func attachController() {
    guard window != nil else { return }
    if controller == nil {
      model.onSelection = { [weak self] id, count, revision in self?.onSelection?(id, count, revision) }
      model.onAction = { [weak self] id in self?.onAction?(id) }
      model.onCustomization = { [weak self] json in self?.onCustomization?(json) }
      model.onSDKEvent = { [weak self] name, value in self?.onSDKEvent?(name, value) }
      controller = OneNativeHostingController(rootView: TabViewContent(model: model, host: self), screenInsets: true)
    }
    controller?.attach(to: self)
    model.active = controller?.isAttached == true
    setActive(model.active)
  }

  private func detachController() {
    model.active = false
    setActive(false)
    controller?.detach()
  }

  public func reset() {
    model.active = false
    model.onSelection = nil
    model.onAction = nil
    model.onCustomization = nil
    model.onSDKEvent = nil
    setActive(false)
    for toolbar in toolbars { toolbar.decompose() }
    toolbars.removeAll()
    detachController()
    controller = nil
    model = TabViewModel()
  }
}

private struct TabViewContent: View {
  @ObservedObject var model: TabViewModel
  weak var host: OneNativeTabViewView?

  var body: some View {
    Group {
      if #available(iOS 18.0, *) {
        slotted(AnyView(tabs.oneNativeTabViewStyle(model.tabViewStyle)))
      } else {
        legacyTabView
      }
    }
    .oneNativeStyle(model.swiftStyle, emit: model.emitSDKEvent)
  }

  private func entries(_ kind: String) -> [OneNativeTabItem] {
    model.pages.filter { $0.kind == kind }
  }


  private func slot(_ page: OneNativeTabItem) -> OneNativeSlot {
    OneNativeSlot(content: page.view, mode: .fill, layoutHost: host, onLayout: page.onLayout)
  }

  @available(iOS 18.0, *)
  private func slotted(_ tabView: AnyView) -> AnyView {
    var view = tabView
    let inline = entries("accessoryInline").first
    let expanded = entries("accessoryExpanded").first
    if #available(iOS 26.0, *), inline != nil || expanded != nil {
      let accessory = AccessoryContent(inline: inline, expanded: expanded, host: host)
      if #available(iOS 26.1, *) {
        view = AnyView(view.tabViewBottomAccessory(isEnabled: model.bottomAccessoryEnabled) { accessory })
      } else {
        view = view.oneNativeViewSlot(OneNativeViewSlotName.tabViewBottomAccessory) { AnyView(accessory) }
      }
    }
    for page in entries("slot") {
      view = view.oneNativeViewSlot(page.id) { AnyView(slot(page).frame(height: page.slotHeight)) }
    }
    if model.customizable {
      view = AnyView(view.tabViewCustomization(model.customizationBinding))
    }
    return view
  }

  @available(iOS 18.0, *)
  private var tabs: some View {
    TabView(selection: Binding(get: { model.controlled.value }, set: { model.select($0) })) {
      ForEach(model.groups) { group in
        if let section = group.section {
          TabSection(section.title) {
            ForEach(group.tabs) { page in tab(page) }
          }
          .oneNativeSectionActions(section.modifiers.sectionActions, press: model.press)
          .oneNativeTabContent(section.modifiers)
        } else if let page = group.tabs.first {
          tab(page)
        }
      }
    }
  }

  @available(iOS 18.0, *)
  @TabContentBuilder<String>
  private func tab(_ page: OneNativeTabItem) -> some TabContent<String> {
    Tab(value: page.id, role: OneNativeGenerated.tabRole(page.role)) {
      if page.modifiers.navigationStack == false {
        styled(slot(page).background(ActionTabHook(host: host, page: page.view)), page)
      } else {
        NavigationStack {
          styled(
            slot(page)
              .background(ActionTabHook(host: host, page: page.view))
              .containerBackground(.clear, for: .navigation),
            page
          )
            .toolbar {
              ForEach(model.toolbarEntries) { entry in
                OneNativeToolbarEntryContent(entry: entry)
              }
            }
        }
      }
    } label: {
      if let image = page.modifiers.image {
        Label(page.title, image: image).oneNativeTabLabelStyle(page.modifiers.labelStyle)
      } else if page.systemImage.isEmpty {
        Text(page.title)
      } else {
        Label(page.title, systemImage: page.systemImage).oneNativeTabLabelStyle(page.modifiers.labelStyle)
      }
    }
    .badge(page.badge.isEmpty ? nil : Text(page.badge))
    .oneNativeTabContent(page.modifiers)
  }

  @available(iOS 18.0, *)
  private func styled(_ content: some View, _ page: OneNativeTabItem) -> some View {
    content
      .oneNativeStyle(page.style, emit: page.emit)
      .toolbarVisibility(OneNativeGenerated.visibility(model.tabBarVisibility), for: .tabBar)
  }

  private var legacyTabView: some View {
    TabView(selection: Binding(get: { model.controlled.value }, set: { model.select($0) })) {
      ForEach(model.groups.flatMap(\\.tabs)) { page in
        slot(page)
          .background(ActionTabHook(host: host, page: page.view))
          .oneNativeStyle(page.style, emit: page.emit)
          .toolbar(OneNativeGenerated.visibility(model.tabBarVisibility), for: .tabBar)
          .tabItem {
            if page.systemImage.isEmpty {
              Text(page.title)
            } else {
              Label(page.title, systemImage: page.systemImage).oneNativeTabLabelStyle(page.modifiers.labelStyle)
            }
          }
          .badge(page.badge.isEmpty ? nil : Text(page.badge))
          .tag(page.id)
      }
    }
  }
}

extension View {
  // the tab item's .labelStyle; unset keeps the bar's automatic title and icon.
  @ViewBuilder func oneNativeTabLabelStyle(_ style: String?) -> some View {
    switch style {
    case nil: self
    case "automatic": self.labelStyle(.automatic)
    case "iconOnly": self.labelStyle(.iconOnly)
    case "titleAndIcon": self.labelStyle(.titleAndIcon)
    case "titleOnly": self.labelStyle(.titleOnly)
    default: preconditionFailure("invalid Swift.Tab labelStyle: \\(style ?? "")")
    }
  }
}

// every TabContent modifier the SDK declares, applied only where the React side set it. each
// conditional modifier carries its content in both branches, so the chain's concrete type doubles
// per modifier. inline, that type spelled out the whole tab (and each section around its tabs) 2^n
// times, and the swift runtime spent most of a minute demangling it before the first frame. inside
// this struct the chain names its content once, as a generic parameter.
@available(iOS 18.0, *)
struct OneNativeTabModified<Content: TabContent>: TabContent where Content.TabValue == String {
  let content: Content
  let m: OneNativeTabModifiers

  var body: some TabContent<String> {
    content
      .hidden(m.hidden ?? false)
      .accessibilityLabel(Text(m.accessibilityLabel ?? ""), isEnabled: m.accessibilityLabel != nil)
      .accessibilityHint(Text(m.accessibilityHint ?? ""), isEnabled: m.accessibilityHint != nil)
      .accessibilityValue(Text(m.accessibilityValue ?? ""), isEnabled: m.accessibilityValue != nil)
      .accessibilityIdentifier(m.accessibilityIdentifier ?? "", isEnabled: m.accessibilityIdentifier != nil)
      .oneNativeDisabled(m.disabled)
      .oneNativeCustomizationID(m.customizationID)
      .oneNativeCustomizationBehavior(m.customizationBehavior)
      .oneNativeDefaultVisibility(m.defaultVisibility)
      .oneNativeSpringLoadingBehavior(m.springLoadingBehavior)
      .oneNativeTabPlacement(m.tabPlacement)
      .oneNativeDefaultSectionExpansion(m.defaultSectionExpansion)
      .oneNativeHelp(m.help)
  }
}

@available(iOS 18.0, *)
extension TabContent where TabValue == String {
  func oneNativeTabContent(_ m: OneNativeTabModifiers) -> OneNativeTabModified<Self> {
    OneNativeTabModified(content: self, m: m)
  }

  @TabContentBuilder<String>
  func oneNativeDisabled(_ disabled: Bool?) -> some TabContent<String> {
    if let disabled, #available(iOS 18.4, *) { self.disabled(disabled) } else { self }
  }

  @TabContentBuilder<String>
  func oneNativeCustomizationID(_ id: String?) -> some TabContent<String> {
    if let id { self.customizationID(id) } else { self }
  }

  @TabContentBuilder<String>
  func oneNativeCustomizationBehavior(_ placed: OneNativePlacedValue?) -> some TabContent<String> {
    if let placed {
      let behavior = OneNativeGenerated.tabCustomizationBehavior(placed.value)
      let p = placed.placements.map(OneNativeGenerated.adaptableTabBarPlacement)
      switch p.count {
      case 0: self.customizationBehavior(behavior)
      case 1: self.customizationBehavior(behavior, for: p[0])
      case 2: self.customizationBehavior(behavior, for: p[0], p[1])
      default: self.customizationBehavior(behavior, for: p[0], p[1], p[2])
      }
    } else { self }
  }

  @TabContentBuilder<String>
  func oneNativeDefaultVisibility(_ placed: OneNativePlacedValue?) -> some TabContent<String> {
    if let placed {
      let visibility = OneNativeGenerated.visibility(placed.value)
      let p = placed.placements.map(OneNativeGenerated.adaptableTabBarPlacement)
      switch p.count {
      case 0: self.defaultVisibility(visibility)
      case 1: self.defaultVisibility(visibility, for: p[0])
      case 2: self.defaultVisibility(visibility, for: p[0], p[1])
      default: self.defaultVisibility(visibility, for: p[0], p[1], p[2])
      }
    } else { self }
  }

  @TabContentBuilder<String>
  func oneNativeSpringLoadingBehavior(_ value: String?) -> some TabContent<String> {
    if let value { self.springLoadingBehavior(OneNativeGenerated.springLoadingBehavior(value)) } else { self }
  }

  @TabContentBuilder<String>
  func oneNativeTabPlacement(_ value: String?) -> some TabContent<String> {
    if let value { self.tabPlacement(OneNativeGenerated.tabPlacement(value)) } else { self }
  }

  // both need api only the iOS 27 SDK declares; One.podspec defines the flag.
  @TabContentBuilder<String>
  func oneNativeDefaultSectionExpansion(_ value: String?) -> some TabContent<String> {
    #if ONE_IOS_27_SDK
    if let value, #available(iOS 27.0, *) {
      self.defaultSectionExpansion(OneNativeGenerated.tabSectionExpansion(value))
    } else { self }
    #else
    self
    #endif
  }

  @TabContentBuilder<String>
  func oneNativeHelp(_ text: String?) -> some TabContent<String> {
    #if ONE_IOS_27_SDK
    if let text, #available(iOS 27.0, *) { self.help(Text(text)) } else { self }
    #else
    self
    #endif
  }

  @TabContentBuilder<String>
  func oneNativeSectionActions(_ actions: [OneNativeSectionAction]?, press: @escaping (String) -> Void) -> some TabContent<String> {
    if let actions, !actions.isEmpty {
      self.sectionActions {
        ForEach(actions) { action in
          Button {
            press(action.id)
          } label: {
            if action.systemImage.isEmpty { Text(action.title) }
            else { Label(action.title, systemImage: action.systemImage) }
          }
        }
      }
    } else { self }
  }
}

@available(iOS 26.0, *)
private struct AccessoryContent: View {
  @Environment(\\.tabViewBottomAccessoryPlacement) private var placement
  let inline: OneNativeTabItem?
  let expanded: OneNativeTabItem?
  weak var host: OneNativeTabViewView?

  var body: some View {
    if let page = placement == .expanded ? (expanded ?? inline) : (inline ?? expanded) {
      OneNativeSlot(content: page.view, mode: .fill, layoutHost: host, onLayout: page.onLayout)
        .frame(maxWidth: .infinity, minHeight: 52, maxHeight: 52)
        .contentShape(Rectangle())
    }
  }
}
`

const tabViewHeader = `#ifdef __cplusplus
#import <React/RCTViewComponentView.h>

NS_ASSUME_NONNULL_BEGIN

// a TabView or a Pager hosting Tab pages; a page reports here when its props move.
@protocol OneNativePageHost <NSObject>
- (void)invalidatePages;
@end

@interface OneNativeTabViewComponentView : RCTViewComponentView <OneNativePageHost>
- (void)invalidatePages;
- (void)pageContentChanged;
@end

@interface OneNativeTabComponentView : RCTViewComponentView
@property (nonatomic, weak, nullable) id<OneNativePageHost> tabs;
@property (nonatomic, copy) NSString *tabId;
@property (nonatomic, copy) NSString *kind;
@property (nonatomic, copy) NSString *title;
@property (nonatomic, copy) NSString *systemImage;
@property (nonatomic, copy) NSString *badge;
@property (nonatomic, copy) NSString *role;
@property (nonatomic, assign) CGFloat slotHeight;
@property (nonatomic, copy) NSString *tabModifiers;
@property (nonatomic, copy) NSDictionary *swiftStyle;
- (void)updateNativeFrame:(CGRect)frame;
- (void)emitSDKEvent:(NSString *)name value:(NSString *)value;
@end

NS_ASSUME_NONNULL_END
#endif
`

const tabViewMM = `#include <cmath>
#import "OneNativeTabViewComponentView.h"
#import <React/RCTView.h>
#import "One-Swift.h"
#import "OneNativeTabShadowNode.h"
#import "OneNativeNavigationStackComponentView.h"
#import <react/renderer/components/OneNativeSpec/ComponentDescriptors.h>
#import <react/renderer/components/OneNativeSpec/EventEmitters.h>
#import <React/RCTConversions.h>
#import "OneNativeStyleDictionary.h"

using namespace facebook::react;

@implementation OneNativeTabViewComponentView {
  OneNativeTabViewView *_tabView;
  NSMutableArray<OneNativeTabComponentView *> *_pages;
  NSMutableArray<OneNativeToolbarView *> *_toolbars;
  BOOL _pagesDirty;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<OneNativeTabViewComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const OneNativeTabViewProps>();
    _pages = [NSMutableArray new];
    _toolbars = [NSMutableArray new];
    _tabView = [OneNativeTabViewView new];
    self.contentView = _tabView;
    __weak OneNativeTabViewComponentView *weakSelf = self;
    _tabView.onSelection = ^(NSString *selection, NSInteger eventCount, NSInteger revision) {
      OneNativeTabViewComponentView *strongSelf = weakSelf;
      if (!strongSelf || !strongSelf->_eventEmitter) return;
      auto emitter = std::static_pointer_cast<const OneNativeTabViewEventEmitter>(strongSelf->_eventEmitter);
      emitter->onNativeTabViewSelectionChange({.selection = std::string(selection.UTF8String), .eventCount = (int)eventCount, .revision = (int)revision});
    };
    _tabView.onAction = ^(NSString *tabId) {
      OneNativeTabViewComponentView *strongSelf = weakSelf;
      if (!strongSelf || !strongSelf->_eventEmitter) return;
      auto emitter = std::static_pointer_cast<const OneNativeTabViewEventEmitter>(strongSelf->_eventEmitter);
      emitter->onNativeTabViewAction({.tabId = std::string(tabId.UTF8String)});
    };
    _tabView.onCustomization = ^(NSString *customization) {
      OneNativeTabViewComponentView *strongSelf = weakSelf;
      if (!strongSelf || !strongSelf->_eventEmitter) return;
      auto emitter = std::static_pointer_cast<const OneNativeTabViewEventEmitter>(strongSelf->_eventEmitter);
      emitter->onNativeTabViewCustomizationChange({.customization = std::string(customization.UTF8String)});
    };
    _tabView.onSDKEvent = ^(NSString *name, NSString *value) {
      OneNativeTabViewComponentView *strongSelf = weakSelf;
      if (!strongSelf || !strongSelf->_eventEmitter) return;
      auto emitter = std::static_pointer_cast<const OneNativeTabViewEventEmitter>(strongSelf->_eventEmitter);
      emitter->onNativeSDKEvent({.name = std::string(name.UTF8String), .value = std::string(value.UTF8String)});
    };
  }
  return self;
}

- (void)mountChildComponentView:(UIView<RCTComponentViewProtocol> *)child index:(NSInteger)index {
  if ([child isKindOfClass:OneNativeToolbarComponentView.class]) {
    OneNativeToolbarView *toolbar = ((OneNativeToolbarComponentView *)child).toolbarView;
    [_toolbars addObject:toolbar];
    [_tabView mountToolbar:toolbar];
    return;
  }
  NSAssert([child isKindOfClass:OneNativeTabComponentView.class], @"Swift.TabView requires Swift.Tab or Swift.Toolbar children");
  OneNativeTabComponentView *page = (OneNativeTabComponentView *)child;
  page.tabs = self;
  [_pages insertObject:page atIndex:MIN(index, _pages.count)];
  [self invalidatePages];
}

- (void)unmountChildComponentView:(UIView<RCTComponentViewProtocol> *)child index:(NSInteger)index {
  if ([child isKindOfClass:OneNativeToolbarComponentView.class]) {
    OneNativeToolbarView *toolbar = ((OneNativeToolbarComponentView *)child).toolbarView;
    [_toolbars removeObjectIdenticalTo:toolbar];
    [_tabView unmountToolbar:toolbar];
    return;
  }
  OneNativeTabComponentView *page = (OneNativeTabComponentView *)child;
  page.tabs = nil;
  [_pages removeObjectIdenticalTo:page];
  [page removeFromSuperview];
  [self invalidatePages];
}

- (void)pageContentChanged {
  [_tabView pageContentChanged];
}

- (void)invalidatePages {
  _pagesDirty = YES;
  [self setNeedsLayout];
}

- (void)layoutSubviews {
  [super layoutSubviews];
  if (!_pagesDirty) return;
  _pagesDirty = NO;
  NSMutableArray *items = [NSMutableArray new];
  for (OneNativeTabComponentView *page in _pages) {
    __weak OneNativeTabComponentView *weakPage = page;
    OneNativeTabItem *item = [[OneNativeTabItem alloc]
      initWithId:page.tabId kind:page.kind title:page.title systemImage:page.systemImage badge:page.badge
      role:page.role slotHeight:page.slotHeight tabModifiers:page.tabModifiers view:page onLayout:^(CGRect frame) {
        OneNativeTabComponentView *strongPage = weakPage;
        if (strongPage.tabs) [strongPage updateNativeFrame:frame];
      }];
    [item configureStyle:page.swiftStyle];
    item.emit = ^(NSString *name, NSString *value) { [weakPage emitSDKEvent:name value:value]; };
    [items addObject:item];
  }
  [_tabView setPages:items];
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
  const auto &next = *std::static_pointer_cast<const OneNativeTabViewProps>(props);
  [_tabView configureStyle:OneNativeStyleDictionary(next.swiftStyle)];
  [_tabView configureWithTabViewStyle:RCTNSStringFromString(next.tabViewStyle)
    tabBarVisibility:RCTNSStringFromString(next.tabBarVisibility)
    customization:RCTNSStringFromString(next.customization)
    customizable:next.customizable
    bottomAccessoryEnabled:next.bottomAccessoryEnabled];
  [_tabView setSelection:RCTNSStringFromString(next.selection) acknowledgedEvent:next.acknowledgedEvent revision:next.revision];
  [super updateProps:props oldProps:oldProps];
}

- (void)prepareForRecycle {
  [super prepareForRecycle];
  for (OneNativeTabComponentView *page in _pages) page.tabs = nil;
  [_pages removeAllObjects];
  [_toolbars removeAllObjects];
  [_tabView reset];
  _pagesDirty = NO;
}

@end

@implementation OneNativeTabComponentView {
  OneNativeTabShadowNode::ConcreteState::Shared _tabState;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<OneNativeTabComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const OneNativeTabProps>();
    _tabId = @"";
    _kind = @"page";
    _title = @"";
    _systemImage = @"";
    _badge = @"";
    _role = @"";
    _slotHeight = 0;
    _tabModifiers = @"{}";
    _swiftStyle = @{};
  }
  return self;
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
  const auto &next = *std::static_pointer_cast<const OneNativeTabProps>(props);
  NSString *tabId = RCTNSStringFromString(next.tabId);
  NSString *title = RCTNSStringFromString(next.title);
  NSString *systemImage = RCTNSStringFromString(next.systemImage);
  NSString *badge = RCTNSStringFromString(next.badge);
  NSString *role = RCTNSStringFromString(next.tabRole);
  NSString *kind = RCTNSStringFromString(next.kind);
  NSString *tabModifiers = RCTNSStringFromString(next.tabModifiers);
  NSDictionary *swiftStyle = OneNativeStyleDictionary(next.swiftStyle);
  BOOL changed = ![self.tabId isEqualToString:tabId] || ![self.kind isEqualToString:kind] ||
    ![self.title isEqualToString:title] || ![self.systemImage isEqualToString:systemImage] ||
    ![self.badge isEqualToString:badge] || ![self.role isEqualToString:role] ||
    self.slotHeight != next.slotHeight || ![self.tabModifiers isEqualToString:tabModifiers] ||
    ![self.swiftStyle isEqualToDictionary:swiftStyle];
  self.tabId = tabId;
  self.kind = kind;
  self.title = title;
  self.systemImage = systemImage;
  self.badge = badge;
  self.role = role;
  self.slotHeight = next.slotHeight;
  self.tabModifiers = tabModifiers;
  self.swiftStyle = swiftStyle;
  if (changed) [self.tabs invalidatePages];
  [super updateProps:props oldProps:oldProps];
}

// a page's React Native content can hold the scroll view the tab bar minimizes for. a Pager's
// pages have no tab bar.
- (void)mountChildComponentView:(UIView<RCTComponentViewProtocol> *)child index:(NSInteger)index {
  [super mountChildComponentView:child index:index];
  if ([self.tabs isKindOfClass:OneNativeTabViewComponentView.class]) [(OneNativeTabViewComponentView *)self.tabs pageContentChanged];
}

- (void)unmountChildComponentView:(UIView<RCTComponentViewProtocol> *)child index:(NSInteger)index {
  [super unmountChildComponentView:child index:index];
  if ([self.tabs isKindOfClass:OneNativeTabViewComponentView.class]) [(OneNativeTabViewComponentView *)self.tabs pageContentChanged];
}

- (void)emitSDKEvent:(NSString *)name value:(NSString *)value {
  if (!_eventEmitter) return;
  auto emitter = std::static_pointer_cast<const OneNativeTabEventEmitter>(_eventEmitter);
  emitter->onNativeSDKEvent({.name = std::string(name.UTF8String), .value = std::string(value.UTF8String)});
}

- (void)updateState:(State::Shared const &)state oldState:(State::Shared const &)oldState {
  _tabState = std::static_pointer_cast<const OneNativeTabShadowNode::ConcreteState>(state);
}

- (void)updateNativeFrame:(CGRect)frame {
  if (!_tabState || !std::isfinite(frame.size.width) || !std::isfinite(frame.size.height)) return;
  const auto &old = _tabState->getData();
  const facebook::react::Size size{(Float)frame.size.width, (Float)frame.size.height};
  const facebook::react::Point origin{(Float)frame.origin.x, (Float)frame.origin.y};
  if (old.measured && old.size == size && old.origin == origin) return;
  OneNativeTabState data;
  data.size = size;
  data.origin = origin;
  data.measured = true;
  _tabState->updateState(std::move(data));
}

- (void)updateLayoutMetrics:(LayoutMetrics const &)layoutMetrics oldLayoutMetrics:(LayoutMetrics const &)oldLayoutMetrics {
  [super updateLayoutMetrics:layoutMetrics oldLayoutMetrics:oldLayoutMetrics];
  // SwiftUI owns placement. Fabric owns the page bounds and descendants' layout.
  self.frame = (CGRect){CGPointZero, self.bounds.size};
}

- (void)prepareForRecycle {
  [super prepareForRecycle];
  self.tabs = nil;
  _tabState.reset();
  _tabId = @""; _kind = @"page"; _title = @""; _systemImage = @""; _badge = @""; _role = @""; _tabModifiers = @"{}";
}

@end
`

const tabShadowH = `#pragma once

#ifdef __cplusplus
#include <react/renderer/components/OneNativeSpec/Props.h>
#include <react/renderer/components/OneNativeSpec/EventEmitters.h>
#include "OneNativeSlotShadowNode.h"

namespace facebook::react {
extern const char OneNativeTabComponentName[];
using OneNativeTabState = OneNativeSlotState;
using OneNativeTabShadowNode = OneNativeSlotShadowNode<OneNativeTabComponentName, OneNativeTabProps, OneNativeTabEventEmitter>;
using OneNativeTabComponentDescriptor = OneNativeSlotComponentDescriptor<OneNativeTabShadowNode>;
}
#endif
`

const tabShadowCpp = `#include "OneNativeTabShadowNode.h"

namespace facebook::react {
extern const char OneNativeTabComponentName[] = "OneNativeTab";
}
`

export function emitTabViewHost(
  header: string,
  outputs: Map<string, string>,
  inventory: readonly Declaration[],
  floor: number,
  ceiling: number
) {
  validateTabViewHost(inventory, floor, ceiling)
  outputs.set('ios/Generated/OneNativeTabViewView.swift', header + tabViewSwift)
  outputs.set('ios/Generated/OneNativeTabViewComponentView.h', header + tabViewHeader)
  outputs.set('ios/Generated/OneNativeTabViewComponentView.mm', header + tabViewMM)
  outputs.set('cpp/OneNativeTabShadowNode.h', header + tabShadowH)
  outputs.set('cpp/OneNativeTabShadowNode.cpp', header + tabShadowCpp)
}
