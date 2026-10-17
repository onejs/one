import SwiftUI
import UIKit

// the shape of a Table's rows and columns: stable ids, and a title per column. React sends
// them as JSON and the cell content as OneNativeTableCell children.
private struct TableRowData: Identifiable, Decodable {
  let id: String
}

private struct TableColumnData: Identifiable, Decodable {
  let id: String
  let title: String
}

struct OneNativeTableSort: Codable, Equatable {
  let column: String
  let ascending: Bool
}

// native reports which column header was tapped and which way; the rows stay in the
// order React sends them, so comparing never reorders.
private struct TableColumnComparator: SortComparator, Hashable {
  var columnId: String
  var order: SortOrder = .forward

  func compare(_ lhs: TableRowData, _ rhs: TableRowData) -> ComparisonResult { .orderedSame }
}

private final class TableModel: ObservableObject {
  @Published var rows: [TableRowData] = []
  @Published var columns: [TableColumnData] = []
  @Published var sortable = false
  @Published var controlled = OneNativeControlled<OneNativeTableSort?>(nil)
  private var rowsJSON = "[]"
  private var columnsJSON = "[]"
  var cells: [ObjectIdentifier: OneNativeTableCellView] = [:]
  var active = false
  var onSortChange: ((String, Int, Int) -> Void)?

  func configure(rows: String, columns: String) {
    if rows != rowsJSON {
      do { self.rows = try JSONDecoder().decode([TableRowData].self, from: Data(rows.utf8)) }
      catch { preconditionFailure("invalid Swift.Table rows \(rows): \(error)") }
      rowsJSON = rows
    }
    if columns != columnsJSON {
      do { self.columns = try JSONDecoder().decode([TableColumnData].self, from: Data(columns.utf8)) }
      catch { preconditionFailure("invalid Swift.Table columns \(columns): \(error)") }
      columnsJSON = columns
    }
  }

  static func parse(sort: String) -> OneNativeTableSort? {
    if sort.isEmpty { return nil }
    do { return try JSONDecoder().decode(OneNativeTableSort.self, from: Data(sort.utf8)) }
    catch { preconditionFailure("invalid Swift.Table sort \(sort): \(error)") }
  }

  var sortOrder: Binding<[TableColumnComparator]> {
    Binding(
      get: { [self] in
        guard let sort = controlled.value else { return [] }
        return [TableColumnComparator(columnId: sort.column, order: sort.ascending ? .forward : .reverse)]
      },
      set: { [self] next in
        guard active, let first = next.first else { return }
        let sort = OneNativeTableSort(column: first.columnId, ascending: first.order == .forward)
        guard controlled.change(sort) else { return }
        do {
          let data = try JSONEncoder().encode(sort)
          onSortChange?(String(decoding: data, as: UTF8.self), controlled.eventCount, controlled.revision)
        } catch { preconditionFailure("invalid Swift.Table sort: \(error)") }
      }
    )
  }
}

@available(iOS 17.4, *)
private struct TableContent: View {
  @ObservedObject var model: TableModel
  @ObservedObject var children: OneNativeChildren
  @ObservedObject var style: OneNativeContainerStyle
  let standalone: Bool
  @ObservedObject var bridge: OneNativeSchemeBridge

  var body: some View {
    let cells = cellContent
    Group {
      if model.sortable {
        Table(model.rows, sortOrder: model.sortOrder) {
          TableColumnForEach(model.columns) { column in
            TableColumn(
              LocalizedStringKey(column.title), sortUsing: TableColumnComparator(columnId: column.id)
            ) { row in
              cell(cells, row, column)
            }
          }
        }
      } else {
        Table(model.rows) {
          TableColumnForEach(model.columns) { column in
            TableColumn(LocalizedStringKey(column.title)) { row in
              cell(cells, row, column)
            }
          }
        }
      }
    }
    .oneNativeContainerStyle(style)
    .oneNativeScheme(standalone, bridge.scheme)
  }

  // the mounted cells by row and column, found once per body rather than per cell.
  private var cellContent: [String: [OneNativeComposedChild]] {
    var found: [String: [OneNativeComposedChild]] = [:]
    for child in children.items {
      guard let cell = model.cells[child.sourceID] else { continue }
      found[cell.key, default: []].append(child)
    }
    return found
  }

  private func cell(_ cells: [String: [OneNativeComposedChild]], _ row: TableRowData, _ column: TableColumnData)
    -> some View
  {
    ForEach(cells[OneNativeTableCellView.key(row: row.id, column: column.id)] ?? []) { child in
      child.content
    }
  }
}

@objcMembers
public final class OneNativeTableView: OneNativeContainerView {
  public var onSortChange: ((String, Int, Int) -> Void)?
  private let model: TableModel
  private let bridge: OneNativeSchemeBridge
  private var traitRegistration: NSObjectProtocol?

  public init() {
    let model = TableModel()
    let bridge = OneNativeSchemeBridge()
    self.model = model
    self.bridge = bridge
    // TableColumnForEach, which builds the columns from data, arrived in iOS 17.4; before it
    // the table draws nothing.
    super.init(styled: { children, style, standalone in
      guard #available(iOS 17.4, *) else { return AnyView(EmptyView()) }
      return AnyView(
        TableContent(model: model, children: children, style: style, standalone: standalone, bridge: bridge))
    })
    model.onSortChange = { [weak self] sort, count, revision in self?.onSortChange?(sort, count, revision) }
    traitRegistration = registerForTraitChanges([UITraitUserInterfaceStyle.self]) {
      [weak bridge] (view: OneNativeTableView, _: UITraitCollection) in
      bridge?.sync(view.traitCollection)
    }
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) is unavailable") }

  public override func didMoveToWindow() {
    bridge.sync(traitCollection)
    super.didMoveToWindow()
  }

  public func configure(
    rows: String, columns: String, sortable: Bool, sort: String, acknowledgedEvent: Int, revision: Int
  ) {
    model.configure(rows: rows, columns: columns)
    if model.sortable != sortable { model.sortable = sortable }
    if let next = model.controlled.applying(
      TableModel.parse(sort: sort), acknowledged: acknowledgedEvent, revision: revision
    ) { model.controlled = next }
  }

  public override func setActive(_ active: Bool) { model.active = active }

  public override func insertChild(_ child: UIView, at index: Int) {
    guard let cell = child as? OneNativeTableCellView else {
      preconditionFailure("Swift.Table cells are made by its own render function")
    }
    model.cells[ObjectIdentifier(cell)] = cell
    super.insertChild(child, at: index)
  }

  public override func removeChild(_ child: UIView) {
    model.cells.removeValue(forKey: ObjectIdentifier(child))
    super.removeChild(child)
  }

  public override func reset() {
    model.active = false
    model.cells = [:]
    model.controlled = OneNativeControlled<OneNativeTableSort?>(nil)
    super.reset()
  }
}
