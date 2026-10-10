import SwiftUI
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

  @available(iOS 17.0, *)
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
    columnVisibility: String,
    columnVisibilityIsControlled: Bool,
    preferredCompactColumn: String,
    preferredCompactColumnIsControlled: Bool
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
    case "all": return .all
    case "doubleColumn": return .doubleColumn
    case "detailOnly": return .detailOnly
    default: return .automatic
    }
  }

  private func visibilityName(_ value: NavigationSplitViewVisibility) -> String {
    switch value {
    case .all: return "all"
    case .doubleColumn: return "doubleColumn"
    case .detailOnly: return "detailOnly"
    default: return "automatic"
    }
  }

  @available(iOS 17.0, *)
  private func compactColumn(_ value: String) -> NavigationSplitViewColumn {
    switch value {
    case "content": return .content
    case "detail": return .detail
    default: return .sidebar
    }
  }

  @available(iOS 17.0, *)
  private func compactColumnName(_ value: NavigationSplitViewColumn) -> String {
    switch value {
    case .content: return "content"
    case .detail: return "detail"
    default: return "sidebar"
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
    toolbarEntries = toolbars.flatMap(\.entries)
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
      if #available(iOS 17.0, *) {
        splitViewWithCompactColumn
      } else {
        splitViewWithoutCompactColumn
      }
    }
    .oneNativeStyle(model.swiftStyle, emit: model.emitSDKEvent)
  }

  @available(iOS 17.0, *)
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
    columnVisibility: String,
    columnVisibilityIsControlled: Bool,
    preferredCompactColumn: String,
    preferredCompactColumnIsControlled: Bool
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
