import Foundation
import UIKit

extension UIKeyboardType {
  private static let keyboardTypeToStringMapping: [UIKeyboardType: String] = [
    .default: "default",
    .asciiCapable: "ascii-capable",
    .numbersAndPunctuation: "numbers-and-punctuation",
    .URL: "url",
    .numberPad: "number-pad",
    .phonePad: "phone-pad",
    .namePhonePad: "name-phone-pad",
    .emailAddress: "email-address",
    .decimalPad: "decimal-pad",
    .twitter: "twitter",
    .webSearch: "web-search",
    .asciiCapableNumberPad: "ascii-capable-number-pad",
  ]

  var name: String {
    return UIKeyboardType.keyboardTypeToStringMapping[self] ?? "default"
  }
}
