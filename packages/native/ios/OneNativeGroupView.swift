import SwiftUI
import UIKit

@objcMembers
public final class OneNativeGroupView: OneNativeContainerView {
  public init() {
    super.init(wrap: { children, _ in
      AnyView(Group { ForEach(children.items) { child in child.content } })
    })
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) is unavailable") }
}
