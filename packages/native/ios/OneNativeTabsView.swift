import SwiftUI
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
    catch { preconditionFailure("invalid Swift.Tab modifiers \(json): \(error)") }
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

private final class TabsModel: ObservableObject {
  @Published var pages: [OneNativeTabItem] = []
  @Published var toolbarEntries: [OneNativeToolbarEntry] = []
  @Published var controlled = OneNativeControlled("")
  @Published var tabViewStyle = "automatic"
  @Published var tabBarVisibility = "automatic"
  @Published var customizable = false
  @Published var bottomAccessoryEnabled = true
  @Published var swiftStyle = OneNativeStyle()
  @Published var tabViewRevision = 0
  // TabViewCustomization's JSON, the form React holds and persists. the decoded value lives
  // beside it so the binding does not decode on every read.
  @Published var customizationJSON = ""
  var customization: Any?
  var active = false
  var onSelection: ((String, Int, Int) -> Void)?
  var onAction: ((String) -> Void)?
  var onCustomization: ((String) -> Void)?
  var onSDKEvent: ((String, String) -> Void)?
  private var pendingAction: String?

  func select(_ id: String) {
    guard active, let page = pages.first(where: { $0.id == id }) else { return }
    if page.kind == "action" {
      // an action tab is a button wearing a tab's chrome, so the press fires and the selection
      // stays put. TabView has already moved its own selection by the time this setter runs, so
      // rebuild it before publishing the action so observers only see a press after the binding
      // has snapped back to the controlled value.
      pendingAction = id
      tabViewRevision += 1
      return
    }
    guard controlled.value != id else { return }
    controlled.change(id)
    onSelection?(id, controlled.eventCount, controlled.revision)
  }

  func press(_ id: String) {
    if active { onAction?(id) }
  }

  func publishPendingAction() {
    guard let id = pendingAction else { return }
    pendingAction = nil
    onAction?(id)
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
        } catch { preconditionFailure("TabViewCustomization failed to encode: \(error)") }
      })
  }

  func applyCustomization(_ json: String) {
    guard json != customizationJSON else { return }
    customizationJSON = json
    guard #available(iOS 18.0, *) else { return }
    if json.isEmpty { customization = TabViewCustomization(); return }
    do { customization = try JSONDecoder().decode(TabViewCustomization.self, from: Data(json.utf8)) }
    catch { preconditionFailure("Swift.Tabs customization is not a TabViewCustomization: \(error)") }
  }
}

@objcMembers
public final class OneNativeTabsView: UIView, OneNativeToolbarHost {
  public var onSelection: ((String, Int, Int) -> Void)?
  public var onAction: ((String) -> Void)?
  public var onCustomization: ((String) -> Void)?
  public var onSDKEvent: ((String, String) -> Void)?
  private var model = TabsModel()
  private var controller: OneNativeHostingController<TabsContent>?
  private var toolbars: [OneNativeToolbarView] = []
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

  public func setPages(_ pages: [OneNativeTabItem]) {
    let topologyChanged = model.pages.map(\.id) != pages.map(\.id)
      || model.pages.map(\.modifiers.section) != pages.map(\.modifiers.section)
    // keep keyed page identities stable so swiftUI reconciles inserted and reordered tabs
    // against their content instead of reusing the page at the same array position.
    let mounted = Dictionary(uniqueKeysWithValues: model.pages.map { ($0.id, $0) })
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
    if topologyChanged { model.tabViewRevision += 1 }
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
    model.toolbarEntries = toolbars.flatMap(\.entries)
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

  private func attachController() {
    guard window != nil else { return }
    if controller == nil {
      model.onSelection = { [weak self] id, count, revision in self?.onSelection?(id, count, revision) }
      model.onAction = { [weak self] id in self?.onAction?(id) }
      model.onCustomization = { [weak self] json in self?.onCustomization?(json) }
      model.onSDKEvent = { [weak self] name, value in self?.onSDKEvent?(name, value) }
      controller = OneNativeHostingController(rootView: TabsContent(model: model, host: self))
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
    model = TabsModel()
  }
}

private struct TabsContent: View {
  @ObservedObject var model: TabsModel
  weak var host: OneNativeTabsView?

  var body: some View {
    Group {
      if #available(iOS 18.0, *) {
        slotted(AnyView(tabs.oneNativeTabViewStyle(model.tabViewStyle)))
      } else {
        legacyTabs
      }
    }
    .oneNativeStyle(model.swiftStyle, emit: model.emitSDKEvent)
  }

  private func entries(_ kind: String) -> [OneNativeTabItem] {
    model.pages.filter { $0.kind == kind }
  }

  private var groups: [TabGroup] {
    var groups: [TabGroup] = []
    for page in model.pages {
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
      ForEach(groups) { group in
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
    .onAppear { model.publishPendingAction() }
    .id(model.tabViewRevision)
  }

  @available(iOS 18.0, *)
  @TabContentBuilder<String>
  private func tab(_ page: OneNativeTabItem) -> some TabContent<String> {
    Tab(value: page.id, role: OneNativeGenerated.tabRole(page.role)) {
      NavigationStack {
        slot(page)
          .oneNativeStyle(page.style, emit: page.emit)
          .toolbarVisibility(OneNativeGenerated.visibility(model.tabBarVisibility), for: .tabBar)
          .toolbar {
            ForEach(model.toolbarEntries) { entry in
              OneNativeToolbarEntryContent(entry: entry)
            }
          }
      }
    } label: {
      if let image = page.modifiers.image { Label(page.title, image: image) }
      else if page.systemImage.isEmpty { Text(page.title) }
      else { Label(page.title, systemImage: page.systemImage) }
    }
    .badge(page.badge.isEmpty ? nil : Text(page.badge))
    .oneNativeTabContent(page.modifiers)
  }

  private var legacyTabs: some View {
    TabView(selection: Binding(get: { model.controlled.value }, set: { model.select($0) })) {
      ForEach(groups.flatMap(\.tabs)) { page in
        slot(page)
          .oneNativeStyle(page.style, emit: page.emit)
          .toolbar(OneNativeGenerated.visibility(model.tabBarVisibility), for: .tabBar)
          .tabItem {
            if page.systemImage.isEmpty {
              Text(page.title)
            } else {
              Label(page.title, systemImage: page.systemImage)
            }
          }
          .badge(page.badge.isEmpty ? nil : Text(page.badge))
          .tag(page.id)
      }
    }
    .onAppear { model.publishPendingAction() }
    .id(model.tabViewRevision)
  }
}

@available(iOS 18.0, *)
extension TabContent where TabValue == String {
  // every TabContent modifier the SDK declares, applied only where the React side set it.
  func oneNativeTabContent(_ m: OneNativeTabModifiers) -> some TabContent<String> {
    self
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

  // both need api only the iOS 27 SDK declares; VxrnNative.podspec defines the flag.
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
  @Environment(\.tabViewBottomAccessoryPlacement) private var placement
  let inline: OneNativeTabItem?
  let expanded: OneNativeTabItem?
  weak var host: OneNativeTabsView?

  var body: some View {
    if let page = placement == .expanded ? (expanded ?? inline) : (inline ?? expanded) {
      OneNativeSlot(content: page.view, mode: .fill, layoutHost: host, onLayout: page.onLayout)
        .frame(maxWidth: .infinity, minHeight: 52, maxHeight: 52)
        .contentShape(Rectangle())
    }
  }
}
