import Foundation
import UIKit

let noFocusedInputEvent: [String: Any] = [
  "target": -1,
  "parentScrollViewTarget": -1,
  "layout": [
    "absoluteX": 0,
    "absoluteY": 0,
    "contentX": 0,
    "contentY": 0,
    "width": 0,
    "height": 0,
    "x": 0,
    "y": 0,
  ],
]

let noFocusedInputSelectionEvent: [AnyHashable: Any] = [:]

@objc(OneKCFocusedInputObserver)
public class FocusedInputObserver: NSObject {
  // class members
  /// handlers
  var onLayoutChangedHandler: (NSDictionary) -> Void
  var onTextChangedHandler: (String) -> Void
  var onSelectionChangedHandler: (NSDictionary) -> Void
  var onFocusDidSet: (NSDictionary) -> Void
  /// delegates
  var delegate: KCTextInputCompositeDelegate
  /// state variables
  private var isMounted = false
  // input tracking
  private var currentInput: UIView?
  private var currentResponder: UIView?
  private var observation: NSKeyValueObservation?
  private var lastLayoutEventDispatched: [AnyHashable: Any] = noFocusedInputEvent
  private var lastSelectionEventDispatched: [AnyHashable: Any] = noFocusedInputSelectionEvent

  @objc public init(
    onLayoutChangedHandler: @escaping (NSDictionary) -> Void,
    onTextChangedHandler: @escaping (String) -> Void,
    onSelectionChangedHandler: @escaping (NSDictionary) -> Void,
    onFocusDidSet: @escaping (NSDictionary) -> Void
  ) {
    self.onLayoutChangedHandler = onLayoutChangedHandler
    self.onTextChangedHandler = onTextChangedHandler
    self.onSelectionChangedHandler = onSelectionChangedHandler
    self.onFocusDidSet = onFocusDidSet

    // Temporary initialization of the delegate with an empty closure
    delegate = KCTextInputCompositeDelegate(onSelectionChange: { _ in }, onTextChange: { _ in })

    super.init()

    // Initialize the delegate
    delegate = KCTextInputCompositeDelegate(
      onSelectionChange: { [weak self] event in
        self?.onSelectionChange(event)
      },
      onTextChange: { [weak self] text in
        self?.onTextChanged(text: text)
      }
    )
  }

  @objc public func mount() {
    if isMounted {
      return
    }

    isMounted = true

    NotificationCenter.default.addObserver(
      self,
      selector: #selector(didReceiveFocus),
      name: UIResponder.keyboardWillShowNotification,
      object: nil
    )
    NotificationCenter.default.addObserver(
      self,
      selector: #selector(didReceiveFocus),
      name: UITextField.textDidBeginEditingNotification,
      object: nil
    )
    NotificationCenter.default.addObserver(
      self,
      selector: #selector(didReceiveFocus),
      name: UITextView.textDidBeginEditingNotification,
      object: nil
    )
    NotificationCenter.default.addObserver(
      self,
      selector: #selector(didReceiveBlur),
      name: UITextField.textDidEndEditingNotification,
      object: nil
    )
    NotificationCenter.default.addObserver(
      self,
      selector: #selector(didReceiveBlur),
      name: UITextView.textDidEndEditingNotification,
      object: nil
    )
  }

  @objc public func unmount() {
    isMounted = false
    // swiftlint:disable:next notification_center_detachment
    NotificationCenter.default.removeObserver(self)
  }

  @objc func didReceiveFocus(_ notification: Notification) {
    if UIResponder.current == currentResponder {
      // The same input is still focused — no need to re-run the full onFocus()
      // setup (observers, delegate substitution, focusDidSet event). However,
      // keyboardWillShowNotification also fires when the keyboard *resizes*
      // (e.g. switching between text and emoji keyboards). In that case we must
      // refresh the layout so consumers receive an up-to-date absoluteY.
      if notification.name == UIResponder.keyboardWillShowNotification {
        syncUpLayout()
      }
      return
    }

    onFocus()
  }

  @objc func didReceiveBlur(_: Notification) {
    // blur gets triggered on endEditing, so we check if no upcoming
    // didReceiveFocus events are coming to exclude `noFocusedInput`
    // event when user switches between inputs
    DispatchQueue.main.async {
      // check that it wasn't a switch between inputs
      if !(UIResponder.current is TextInput) {
        self.onBlur()
      }
    }
  }

  func onFocus() {
    guard let responder = UIResponder.current as? UIView else { return }
    removeObservers(newResponder: responder)
    currentResponder = responder
    currentInput = currentResponder?.superview as UIView?

    setupObservers()
    // dispatch onSelectionChange on focus
    DispatchQueue.main.async {
      self.syncUpSelection()
    }

    syncUpLayout()

    FocusedInputHolder.shared.set(currentResponder as? TextInput)

    let groupAncestor = ViewHierarchyNavigator.findGroupAncestor(currentResponder)
    let allInputFields = ViewHierarchyNavigator.getAllInputFields(root: groupAncestor)
    let currentIndex = allInputFields.firstIndex(where: { $0 == currentResponder }) ?? -1

    onFocusDidSet([
      "current": currentIndex,
      "count": allInputFields.count,
    ])
  }

  func onBlur() {
    removeObservers(newResponder: nil)
    currentInput = nil
    currentResponder = nil
    lastSelectionEventDispatched = noFocusedInputSelectionEvent
    dispatchLayoutEventToJS(data: noFocusedInputEvent)
  }

  @objc public func syncUpLayout() {
    let responder = currentResponder as UIResponder?
    let focusedInput = currentInput
    let globalFrame = focusedInput?.globalFrame

    guard let frame = globalFrame, let input = focusedInput else { return }

    let parentScrollView = responder.parentScrollView
    let location = input.locationInScrollView(parentScrollView)

    let data: [String: Any] = [
      "target": responder.reactViewTag,
      "parentScrollViewTarget": parentScrollView.reactViewTag,
      "layout": [
        "absoluteX": frame.origin.x,
        "absoluteY": frame.origin.y,
        "contentX": location.x,
        "contentY": location.y,
        "width": input.frame.width,
        "height": input.frame.height,
        "x": input.frame.origin.x,
        "y": input.frame.origin.y,
      ],
    ]

    dispatchLayoutEventToJS(data: data)
  }

  private func syncUpSelection() {
    guard let textInput = currentResponder as? UITextInput else { return }
    updateSelectionPosition(textInput: textInput, sendEvent: onSelectionChange)
  }

  private func onTextChanged(text: String?) {
    syncUpLayout()

    if let string = text {
      onTextChangedHandler(string)
    }
  }

  private func dispatchLayoutEventToJS(data: [String: Any]) {
    if NSDictionary(dictionary: data).isEqual(to: lastLayoutEventDispatched) {
      return
    }

    lastLayoutEventDispatched = data
    onLayoutChangedHandler(data as NSDictionary)
  }

  private func dispatchSelectionEventToJS(data: [String: Any]) {
    if NSDictionary(dictionary: data).isEqual(to: lastSelectionEventDispatched) {
      return
    }

    lastSelectionEventDispatched = data
    onSelectionChangedHandler(data as NSDictionary)
  }

  private func setupObservers() {
    if observation != nil {
      return
    }

    if currentInput != nil {
      observation = currentInput?.observe(\.center, options: .new) { [weak self] view, change in
        guard let self = self else { return }
        self.onLayoutChange(view: view, change: change)
      }

      // Substitute a delegate in the next frame.
      // This is only applicable if the autoFocus prop is true.
      // Other libraries (e.g., decorator views) might mount *after* the
      // TextInput and inject their own delegates at that point.
      // If we substitute our delegate too early (e.g., during autoFocus), and later restore it when the keyboard hides,
      // we may accidentally overwrite a delegate injected by another library — breaking its logic.
      DispatchQueue.main.async {
        self.substituteDelegate(self.currentResponder)
      }
    }
  }

  private func removeObservers(newResponder: UIResponder?) {
    if newResponder == currentResponder || observation == nil {
      return
    }

    observation?.invalidate()
    observation = nil

    substituteDelegateBack(currentResponder)
  }

  private func substituteDelegate(_ input: UIResponder?) {
    if let textField = input as? UITextField {
      if !(textField.delegate is KCTextInputCompositeDelegate) {
        delegate.setTextFieldDelegate(delegate: textField.delegate, textField: textField)
        textField.oneKC_setForceDelegate(delegate)
      }
    } else if let textView = input as? UITextView, !(textView.delegate is KCTextInputCompositeDelegate) {
      delegate.setTextViewDelegate(delegate: textView.delegate)
      textView.oneKC_setForceDelegate(delegate)
    }
  }

  private func substituteDelegateBack(_ input: UIResponder?) {
    // substitution is deferred, so the input may lose focus before it gets our delegate;
    // in this case `activeDelegate` belongs to another input and must not be assigned
    if let textField = input as? UITextField, textField.delegate === delegate,
       let oldDelegate = delegate.activeDelegate as? UITextFieldDelegate
    {
      textField.oneKC_setForceDelegate(oldDelegate)
    } else if let textView = input as? UITextView, textView.delegate === delegate,
              let oldDelegate = delegate.activeDelegate as? UITextViewDelegate
    {
      textView.oneKC_setForceDelegate(oldDelegate)
    }
  }

  private func onLayoutChange(view _: UIView, change _: NSKeyValueObservedChange<CGPoint>) {
    // we need to read layout in next frame, otherwise we'll get old
    // layout values
    DispatchQueue.main.async {
      self.syncUpLayout()

      // iOS can report selection before the input resizes, leaving stale caret coordinates.
      // Re-read selection after layout to dispatch updated coordinates even when
      // the selection range has not changed.
      self.syncUpSelection()
    }
  }

  private func onSelectionChange(_ event: NSDictionary) {
    // Safely retrieve the event dictionary as a Swift dictionary
    guard let eventDict = event as? [String: Any] else {
      return
    }

    syncUpLayout()

    let target: [String: Any] = [
      "target": (currentResponder as UIResponder?).reactViewTag,
    ]

    let data = target.merging(eventDict) { _, new in new }

    dispatchSelectionEventToJS(data: data)
  }
}
