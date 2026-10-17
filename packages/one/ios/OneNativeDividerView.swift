import SwiftUI
import UIKit

@objcMembers
public final class OneNativeDividerView: OneNativeStyledLeafView {
  public init() {
    super.init(styled: { style in AnyView(Divider().oneNativeContainerStyle(style)) })
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) is unavailable") }
}
