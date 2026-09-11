import SwiftUI
import UIKit

extension View {
  @ViewBuilder func oneNativeKeyboardType(_ value: String) -> some View {
    switch value {
    case "asciiCapable": self.keyboardType(.asciiCapable)
    case "numbersAndPunctuation": self.keyboardType(.numbersAndPunctuation)
    case "url", "URL": self.keyboardType(.URL)
    case "numberPad": self.keyboardType(.numberPad)
    case "phonePad": self.keyboardType(.phonePad)
    case "namePhonePad": self.keyboardType(.namePhonePad)
    case "emailAddress": self.keyboardType(.emailAddress)
    case "decimalPad": self.keyboardType(.decimalPad)
    case "twitter": self.keyboardType(.twitter)
    case "webSearch": self.keyboardType(.webSearch)
    case "asciiCapableNumberPad": self.keyboardType(.asciiCapableNumberPad)
    case "default": self.keyboardType(.default)
    default: self
    }
  }

  @ViewBuilder func oneNativeTextContentType(_ value: String) -> some View {
    if value.isEmpty || value == "none" {
      self
    } else {
      self.textContentType(UITextContentType(rawValue: value))
    }
  }
}
