import SwiftUI
import UIKit

private struct TableCellContent: View {
  @ObservedObject var children: OneNativeChildren
  @ObservedObject var style: OneNativeContainerStyle

  var body: some View {
    Group { ForEach(children.items) { child in child.content } }
      .oneNativeContainerStyle(style)
  }
}

// the content React rendered for one row and column of a Table. the table looks a cell
// up by both ids when SwiftUI builds that row's column.
@objcMembers
public final class OneNativeTableCellView: OneNativeContainerView {
  public private(set) var rowId = ""
  public private(set) var columnId = ""

  static func key(row: String, column: String) -> String { "\(row)\u{0}\(column)" }
  var key: String { Self.key(row: rowId, column: columnId) }

  public init() {
    super.init(styled: { children, style, _ in
      AnyView(TableCellContent(children: children, style: style))
    })
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) is unavailable") }

  // the table finds this cell by its ids when SwiftUI builds the column, and nothing
  // observes them, so a mounted cell never changes slot: React keys cells by both ids, and
  // a recycled cell is reset first.
  public func configure(rowId: String, columnId: String) {
    guard self.rowId != rowId || self.columnId != columnId else { return }
    precondition(
      self.rowId.isEmpty && self.columnId.isEmpty,
      "Swift.Table cell \(key) cannot become \(Self.key(row: rowId, column: columnId))")
    self.rowId = rowId
    self.columnId = columnId
    refreshComposedIdentity()
  }

  public override func reset() {
    rowId = ""
    columnId = ""
    super.reset()
  }
}
