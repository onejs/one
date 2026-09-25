import SwiftUI
import UIKit

extension View {
  @ViewBuilder func oneNativeColorRole(_ role: String) -> some View {
    if role.isEmpty {
      self
    } else {
      foregroundStyle(oneNativeSemanticColor(role))
    }
  }

}

private func oneNativeSemanticColor(_ role: String) -> Color {
  switch role {
  case "accent": return .accentColor
  case "primary": return Color(uiColor: .label)
  case "secondary": return Color(uiColor: .secondaryLabel)
  case "tertiary": return Color(uiColor: .tertiaryLabel)
  case "danger": return Color(uiColor: .systemRed)
  default: preconditionFailure("unknown One.UI color role: \(role)")
  }
}
