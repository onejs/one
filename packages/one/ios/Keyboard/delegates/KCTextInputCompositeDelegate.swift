import Foundation

/// `caretRect(for:)` is in `textInputView`'s coordinates. For a `UITextField` that is its inner text area, which
/// starts below the field's top padding, so the caret came out higher than it is. Android measures y from the
/// field's top, and so does `KeyboardAwareScrollView` when it adds the caret to the input's layout.
func caretYOffset(in textInput: UITextInput) -> CGFloat {
  guard let textField = textInput as? UITextField else { return 0 }

  return textField.textInputView.convert(CGPoint.zero, to: textField).y
}

func textSelection(in textInput: UITextInput) -> NSDictionary? {
  if let selectedRange = textInput.selectedTextRange {
    let caretRectStart = textInput.caretRect(for: selectedRange.start)
    let caretRectEnd = textInput.caretRect(for: selectedRange.end)
    let yOffset = caretYOffset(in: textInput)

    return [
      "selection": [
        "start": [
          "x": caretRectStart.origin.x,
          "y": caretRectStart.origin.y + yOffset,
          "position": textInput.offset(from: textInput.beginningOfDocument, to: selectedRange.start),
        ],
        "end": [
          "x": caretRectEnd.origin.x + caretRectEnd.size.width,
          "y": caretRectEnd.origin.y + caretRectEnd.size.height + yOffset,
          "position": textInput.offset(from: textInput.beginningOfDocument, to: selectedRange.end),
        ],
      ],
    ]
  }

  return nil
}

func updateSelectionPosition(textInput: UITextInput, sendEvent: (_ event: NSDictionary) -> Void) {
  if let selection = textSelection(in: textInput) {
    sendEvent(selection)
  }
}

/**
 * A delegate that is being set to any focused input
 * and intercepts some specific events that needs to be handled
 * for universal keyboard avoiding solutions (such as text selection etc.)
 * and forward all calls to underlying delegate
 */
class KCTextInputCompositeDelegate: NSObject, UITextViewDelegate, UITextFieldDelegate {
  // constructor members
  var onSelectionChange: (_ event: NSDictionary) -> Void
  var onTextChange: (_ text: String?) -> Void
  // delegates
  weak var textViewDelegate: UITextViewDelegate?
  weak var textFieldDelegate: UITextFieldDelegate?

  /// Keep track of which textField we’re observing (iOS < 13 only)
  private weak var observedTextFieldForSelection: UITextField?

  private var pendingSelectionUpdate = DispatchWorkItem {}

  init(
    onSelectionChange: @escaping (_ event: NSDictionary) -> Void,
    onTextChange: @escaping (_ text: String?) -> Void
  ) {
    self.onSelectionChange = onSelectionChange
    self.onTextChange = onTextChange
  }

  // MARK: setters/getters

  func setTextViewDelegate(delegate: UITextViewDelegate?) {
    // remove KVO from any old textField
    if let oldTextField = observedTextFieldForSelection {
      removeSelectionRangeObserver(from: oldTextField)
    }

    textViewDelegate = delegate
    textFieldDelegate = nil
    observedTextFieldForSelection = nil
  }

  func setTextFieldDelegate(delegate: UITextFieldDelegate?, textField: UITextField?) {
    // remove KVO from any old textField
    if let oldTextField = observedTextFieldForSelection {
      removeSelectionRangeObserver(from: oldTextField)
    }

    textFieldDelegate = delegate
    textViewDelegate = nil

    // If iOS < 13, add KVO to the actual textField object
    if #available(iOS 13.0, *) {
      // rely on textFieldDidChangeSelection
      observedTextFieldForSelection = nil
    } else if let realTextField = textField {
      addSelectionRangeObserver(to: realTextField)
      observedTextFieldForSelection = realTextField
    }
  }

  /// Getter for the active delegate
  var activeDelegate: AnyObject? {
    return textViewDelegate ?? textFieldDelegate
  }

  // MARK: UITextViewDelegate

  func textViewDidChangeSelection(_ textView: UITextView) {
    textViewDelegate?.textViewDidChangeSelection?(textView)

    // The selection is reported before UIKit lays out the edit, and asking the layout whether it is ready
    // (`firstRect`) is what broke the split paragraph in #1593, so every read waits a frame; a growing
    // input needs that frame anyway (#489). The delay also replaces the old `_comingFromJS` check: RN
    // re-applying the text from JS moves the selection to the end and restores it within one call, and a
    // read a frame later sees only the restored selection (#1148).
    pendingSelectionUpdate.cancel()
    pendingSelectionUpdate = DispatchWorkItem { [weak self, weak textView] in
      guard let self = self, let textView = textView,
            textView.isFirstResponder, textView.delegate === self else { return }
      updateSelectionPosition(textInput: textView, sendEvent: self.onSelectionChange)
    }
    DispatchQueue.main.asyncAfter(deadline: .now() + UIUtils.nextFrame, execute: pendingSelectionUpdate)
  }

  func textViewDidChange(_ textView: UITextView) {
    defer {
      self.onTextChange(textView.text)
    }

    textViewDelegate?.textViewDidChange?(textView)
  }

  // MARK: UITextFieldDelegate

  @available(iOS 13.0, *)
  func textFieldDidChangeSelection(_ textField: UITextField) {
    textFieldDelegate?.textFieldDidChangeSelection?(textField)
    updateSelectionPosition(textInput: textField, sendEvent: onSelectionChange)
  }

  func textField(
    _ textField: UITextField,
    shouldChangeCharactersIn range: NSRange,
    replacementString string: String
  ) -> Bool {
    defer {
      self.onTextChange(textField.text)
    }

    if #unavailable(iOS 13.0) {
      DispatchQueue.main.asyncAfter(deadline: .now() + UIUtils.nextFrame) {
        updateSelectionPosition(textInput: textField, sendEvent: self.onSelectionChange)
      }
    }

    return textFieldDelegate?.textField?(textField, shouldChangeCharactersIn: range, replacementString: string) ?? true
  }

  func textFieldDidEndEditing(_ textField: UITextField) {
    textFieldDelegate?.textFieldDidEndEditing?(textField)

    if #unavailable(iOS 13.0) {
      removeSelectionRangeObserver(from: textField)
      if observedTextFieldForSelection === textField {
        observedTextFieldForSelection = nil
      }
    }
  }

  // MARK: KVO for iOS < 13

  private func addSelectionRangeObserver(to textField: UITextField) {
    textField.addObserver(
      self,
      forKeyPath: "selectedTextRange",
      options: [.new],
      context: nil
    )
  }

  private func removeSelectionRangeObserver(from textField: UITextField) {
    textField.removeObserver(self, forKeyPath: "selectedTextRange")
  }

  // swiftlint:disable:next block_based_kvo
  override func observeValue(
    forKeyPath keyPath: String?,
    of object: Any?,
    change: [NSKeyValueChangeKey: Any]?,
    context: UnsafeMutableRawPointer?
  ) {
    guard keyPath == "selectedTextRange", let textField = object as? UITextField else {
      super.observeValue(forKeyPath: keyPath, of: object, change: change, context: context)
      return
    }
    // selection changed => forward the event
    updateSelectionPosition(textInput: textField, sendEvent: onSelectionChange)
  }

  // MARK: call forwarding

  /// Decides whether `aSelector` should be forwarded to `delegate`.
  ///
  /// Usually we stay fully transparent and forward every selector the
  /// underlying delegate responds to. The exception is a field that acts as its
  /// own UIKit delegate and relays callbacks to an inner delegate through
  /// `forwardInvocation:` (e.g. `BKForwardingTextField`). For such a field
  /// `activeDelegate` is the text input *itself*, so it also "responds" to the
  /// many `UITextField` / `UITextView` methods that UIKit relays to its delegate
  /// (e.g. `keyboardInputChangedSelection:`). Forwarding one of those back to the
  /// field makes the field relay it to us again — an infinite recursion.
  ///
  /// To stay transparent without looping, when the delegate is the text input
  /// itself we forward only the selectors it handles *dynamically* (i.e. the
  /// ones it routes to its inner delegate via its own message forwarding), and
  /// never the ones it implements as a UIKit object. `instancesRespond(to:)`
  /// inspects the real method table only, so it is `false` exactly for the
  /// selectors resolved through the field's own `forwardInvocation:`.
  private func shouldForward(_ aSelector: Selector!, to delegate: AnyObject) -> Bool {
    guard delegate.responds(to: aSelector) else {
      return false
    }

    if delegate is UITextField || delegate is UITextView,
       let delegateClass = type(of: delegate) as? NSObject.Type
    {
      return !delegateClass.instancesRespond(to: aSelector)
    }

    return true
  }

  override func responds(to aSelector: Selector!) -> Bool {
    if super.responds(to: aSelector) {
      return true
    }
    guard let activeDelegate = activeDelegate else {
      return false
    }
    return shouldForward(aSelector, to: activeDelegate)
  }

  override func forwardingTarget(for aSelector: Selector!) -> Any? {
    if let activeDelegate = activeDelegate, shouldForward(aSelector, to: activeDelegate) {
      return activeDelegate
    }
    return super.forwardingTarget(for: aSelector)
  }

  override func doesNotRecognizeSelector(_ aSelector: Selector!) {
    let className = NSStringFromClass(type(of: self))
    let selectorName = NSStringFromSelector(aSelector)

    print("⚠️ [\(className)] does not recognize selector: \(selectorName)")

    if let delegate = activeDelegate {
      print("ℹ️ activeDelegate: \(type(of: delegate)) (responds: \(delegate.responds(to: aSelector)))")
    } else {
      print("ℹ️ activeDelegate is nil")
    }
  }
}
