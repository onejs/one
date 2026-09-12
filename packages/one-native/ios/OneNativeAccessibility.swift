import SwiftUI

// react native declares accessibility props on every component through ViewProps, and UIKit
// applies them to the backing UIView. a composed control's UIView is never displayed, so there
// they do nothing. forwarding them into the SwiftUI content is what makes one prop mean the
// same thing standalone and composed.
public struct OneNativeAccessibility: Equatable {
  public var label = ""
  public var hint = ""
  public var value = ""
  public var identifier = ""
  public init() {}
  public init(label: String, hint: String, value: String, identifier: String) {
    self.label = label
    self.hint = hint
    self.value = value
    self.identifier = identifier
  }
}

extension View {
  public func oneNativeAccessibility(_ accessibility: OneNativeAccessibility) -> some View {
    self
      .oneNativeAccessibilityIdentifier(accessibility.identifier)
      .oneNativeAccessibilityLabel(accessibility.label)
      .oneNativeAccessibilityHint(accessibility.hint)
      .oneNativeAccessibilityValue(accessibility.value)
  }

  // an empty string means the prop was not set. applying it anyway would erase the control's
  // own label, so each modifier is skipped instead of passed an empty Text.
  @ViewBuilder fileprivate func oneNativeAccessibilityIdentifier(_ text: String) -> some View {
    if text.isEmpty { self } else { accessibilityIdentifier(text) }
  }
  @ViewBuilder fileprivate func oneNativeAccessibilityLabel(_ text: String) -> some View {
    if text.isEmpty { self } else { accessibilityLabel(Text(text)) }
  }
  @ViewBuilder fileprivate func oneNativeAccessibilityHint(_ text: String) -> some View {
    if text.isEmpty { self } else { accessibilityHint(Text(text)) }
  }
  @ViewBuilder fileprivate func oneNativeAccessibilityValue(_ text: String) -> some View {
    if text.isEmpty { self } else { accessibilityValue(Text(text)) }
  }
}
