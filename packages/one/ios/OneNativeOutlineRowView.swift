import SwiftUI
import UIKit

private struct OutlineRowContent: View {
  @ObservedObject var children: OneNativeChildren
  @ObservedObject var style: OneNativeContainerStyle

  var body: some View {
    Group { ForEach(children.items) { child in child.content } }
      .oneNativeContainerStyle(style)
  }
}

// the row content React rendered for one node of an OutlineGroup's tree. the group looks
// a row up by rowId when SwiftUI builds that node's row.
@objcMembers
public final class OneNativeOutlineRowView: OneNativeContainerView {
  public private(set) var rowId = ""

  public init() {
    super.init(styled: { children, style, _ in
      AnyView(OutlineRowContent(children: children, style: style))
    })
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) is unavailable") }

  // the group finds this row by its id when SwiftUI builds the node's row, and nothing
  // observes the id, so a mounted row never changes node: React keys rows by id, and a
  // recycled row is reset first.
  public func configure(rowId: String) {
    guard self.rowId != rowId else { return }
    precondition(self.rowId.isEmpty, "Swift.OutlineGroup row \(self.rowId) cannot become \(rowId)")
    self.rowId = rowId
    refreshComposedIdentity()
  }

  public override func reset() {
    rowId = ""
    super.reset()
  }
}
