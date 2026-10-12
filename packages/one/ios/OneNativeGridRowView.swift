import SwiftUI
import UIKit

private final class GridRowModel: ObservableObject {
  @Published var alignment = ""
}

// no modifier may wrap the row: a Grid recognizes a GridRow only as the view itself, and
// a modified one becomes a single cell spanning every column.
private struct GridRowContent: View {
  @ObservedObject var model: GridRowModel
  @ObservedObject var children: OneNativeChildren

  var body: some View {
    // an empty alignment leaves the row on the grid's own.
    GridRow(
      alignment: model.alignment.isEmpty
        ? nil : OneNativeGridValues.vertical(model.alignment, "Swift.GridRow")
    ) {
      ForEach(children.items) { child in child.content }
    }
  }
}

@objcMembers
public final class OneNativeGridRowView: OneNativeContainerView {
  private let model: GridRowModel

  public init() {
    let model = GridRowModel()
    self.model = model
    super.init(wrap: { children, _ in
      AnyView(GridRowContent(model: model, children: children))
    })
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) is unavailable") }

  public func configure(alignment: String) {
    if model.alignment != alignment { model.alignment = alignment }
  }
}
