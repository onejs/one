import Foundation

class FocusedInputHolder {
  static let shared = FocusedInputHolder()

  /// Using TextInput protocol as the type for currentFocusedInput
  private weak var currentFocusedInput: TextInput?

  /// Sets the currentFocusedInput to the passed instance conforming to TextInput or clears it if nil is passed
  func set(_ input: TextInput?) {
    currentFocusedInput = input
  }

  func get() -> TextInput? {
    return currentFocusedInput
  }

  /// Requests focus for the currentFocusedInput if it's set
  func focus() {
    currentFocusedInput?.focus()
  }

  private init() {}
}
