import SwiftUI
import UIKit

// keyboardType and textContentType are UIKit enums, not SwiftUI ones, so the SDK-driven enum
// generation in codegen/generate.ts does not reach them and these two converters are written by
// hand. `src/textTypes.ts` carries the same two lists for the public types. An unknown value is a
// caller bug and fails loudly here, the way every generated converter does: UITextContentType
// takes any raw string, so passing one through unchecked would silently do nothing.
private let supportedTextContentTypes: Set<String> = [
  "URL", "addressCity", "addressCityAndState", "addressState", "countryName",
  "creditCardNumber", "creditCardExpiration", "creditCardExpirationMonth",
  "creditCardExpirationYear", "creditCardSecurityCode", "creditCardType", "creditCardName",
  "creditCardGivenName", "creditCardMiddleName", "creditCardFamilyName", "emailAddress",
  "familyName", "fullStreetAddress", "givenName", "jobTitle", "location", "middleName", "name",
  "namePrefix", "nameSuffix", "nickname", "organizationName", "postalCode", "streetAddressLine1",
  "streetAddressLine2", "sublocality", "telephoneNumber", "username", "password", "newPassword",
  "oneTimeCode", "birthdate", "birthdateDay", "birthdateMonth", "birthdateYear", "cellularEID",
  "cellularIMEI", "dateTime", "flightNumber", "shipmentTrackingNumber",
]

extension View {
  @ViewBuilder func oneNativeKeyboardType(_ value: String) -> some View {
    switch value {
    case "", "default": self.keyboardType(.default)
    case "asciiCapable": self.keyboardType(.asciiCapable)
    case "numbersAndPunctuation": self.keyboardType(.numbersAndPunctuation)
    case "url": self.keyboardType(.URL)
    case "numberPad": self.keyboardType(.numberPad)
    case "phonePad": self.keyboardType(.phonePad)
    case "namePhonePad": self.keyboardType(.namePhonePad)
    case "emailAddress": self.keyboardType(.emailAddress)
    case "decimalPad": self.keyboardType(.decimalPad)
    case "twitter": self.keyboardType(.twitter)
    case "webSearch": self.keyboardType(.webSearch)
    case "asciiCapableNumberPad": self.keyboardType(.asciiCapableNumberPad)
    default: let _ = preconditionFailure("invalid KeyboardType: \(value)"); self
    }
  }

  @ViewBuilder func oneNativeTextContentType(_ value: String) -> some View {
    if value.isEmpty || value == "none" {
      self
    } else if supportedTextContentTypes.contains(value) {
      self.textContentType(UITextContentType(rawValue: value))
    } else {
      let _ = preconditionFailure("invalid TextContentType: \(value)"); self
    }
  }
}
