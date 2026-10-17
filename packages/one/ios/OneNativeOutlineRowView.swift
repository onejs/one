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

  public func configure(rowId: String) {
    guard self.rowId != rowId else { return }
    self.rowId = rowId
    refreshComposedIdentity()
  }
}
