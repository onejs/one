import SwiftUI
import UIKit

// a button is a measured container: its label is either the text the label props
// describe or the composed children React published, and both render inside the same
// SwiftUI Button, so role, style and enabled state apply to either. standalone the
// button measures like a host and answers to Yoga; composed the parent measures it.
private final class ButtonModel: ObservableObject {
  @Published var label = ""
  @Published var disabled = false
  @Published var subtitle = ""
  @Published var systemImage = ""
  @Published var buttonRole = ""
  @Published var buttonStyle = "automatic"
  @Published var disclosureIndicator = false
  @Published var accessibility = OneNativeAccessibility()
  @Published var swiftStyle = OneNativeStyle()
  var active = false
  var onHeight: ((CGFloat) -> Void)?
  var onPress: ((Int) -> Void)?
  private var pressCount = 0
  func press() {
    guard active, !disabled else { return }
    pressCount += 1
    onPress?(pressCount)
  }
}

private struct ButtonContent: View {
  @ObservedObject var model: ButtonModel
  @ObservedObject var children: OneNativeChildren
  // composed, the parent lays the button out and measures it; only a standalone
  // button answers to Yoga.
  let standalone: Bool

  var body: some View {
    Button(role: OneNativeGenerated.buttonRole(model.buttonRole), action: { model.press() }) {
      label
    }
    .oneNativeButtonStyle(model.buttonStyle)
    .disabled(model.disabled)
    .oneNativeAccessibility(model.accessibility)
    .oneNativeStyle(model.swiftStyle)
    .frame(maxWidth: standalone ? .infinity : nil, alignment: .leading)
    .oneNativeMeasured(standalone, model.onHeight)
  }

  // the label is either the composed children or the text the props describe: React
  // rejects both at once, so this branch is total.
  @ViewBuilder private var label: some View {
    if children.items.isEmpty {
      if model.subtitle.isEmpty {
        model.oneNativePrimary
      } else {
        VStack(alignment: .leading, spacing: 2) {
          model.oneNativePrimary
          Text(model.subtitle).font(.subheadline).foregroundStyle(.secondary)
        }
      }
    } else if model.disclosureIndicator {
      HStack {
        HStack(spacing: 0) {
          ForEach(children.items) { child in child.content }
        }
        Spacer()
        Image(systemName: "chevron.right").foregroundStyle(.secondary)
      }
      .frame(maxWidth: .infinity)
    } else {
      HStack(spacing: 0) {
        ForEach(children.items) { child in child.content }
      }
    }
  }
}

private extension ButtonModel {
  // the text label is the same whether or not a disclosure indicator follows it, so
  // the image-or-text rule is written once. an icon-only button renders the image
  // alone rather than a label with an empty title, so no title spacing is reserved.
  @ViewBuilder var oneNativeLabel: some View {
    if !label.isEmpty, !systemImage.isEmpty { Label(label, systemImage: systemImage) }
    else if !systemImage.isEmpty { Image(systemName: systemImage) }
    else { Text(label) }
  }
  // the primary line is the same with or without a subtitle under it.
  @ViewBuilder var oneNativePrimary: some View {
    if disclosureIndicator {
      HStack {
        oneNativeLabel
        Spacer()
        Image(systemName: "chevron.right").foregroundStyle(.secondary)
      }
      .frame(maxWidth: .infinity)
    } else {
      oneNativeLabel
    }
  }
}

@objcMembers
public final class OneNativeButtonView: OneNativeContainerView {
  public var onPress: ((Int) -> Void)?
  public var onMeasure: ((CGFloat) -> Void)?
  private let model: ButtonModel

  public init() {
    let model = ButtonModel()
    self.model = model
    super.init(wrap: { children, standalone in
      AnyView(ButtonContent(model: model, children: children, standalone: standalone))
    })
    model.onHeight = { [weak self] height in self?.onMeasure?(height) }
    model.onPress = { [weak self] pressCount in self?.onPress?(pressCount) }
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) is unavailable") }

  public func configureAccessibility(_ label: String, hint: String, value: String, identifier: String) {
    let next = OneNativeAccessibility(label: label, hint: hint, value: value, identifier: identifier)
    if model.accessibility != next { model.accessibility = next }
  }
  public func configureStyle(_ style: [String: Any]) {
    let next = OneNativeStyle(dictionary: style)
    if model.swiftStyle != next { model.swiftStyle = next }
  }
  public func configure(
    label: String, disabled: Bool, subtitle: String, systemImage: String,
    buttonRole: String, buttonStyle: String, disclosureIndicator: Bool
  ) {
    if model.label != label { model.label = label }
    if model.disabled != disabled { model.disabled = disabled }
    if model.subtitle != subtitle { model.subtitle = subtitle }
    if model.systemImage != systemImage { model.systemImage = systemImage }
    if model.buttonRole != buttonRole { model.buttonRole = buttonRole }
    if model.buttonStyle != buttonStyle { model.buttonStyle = buttonStyle }
    if model.disclosureIndicator != disclosureIndicator { model.disclosureIndicator = disclosureIndicator }
  }

  public override func setActive(_ active: Bool) { model.active = active }

  public override func reset() {
    model.label = ""
    model.disabled = false
    model.subtitle = ""
    model.systemImage = ""
    model.buttonRole = ""
    model.buttonStyle = "automatic"
    model.disclosureIndicator = false
    model.accessibility = OneNativeAccessibility()
    model.swiftStyle = OneNativeStyle()
    super.reset()
  }
}
