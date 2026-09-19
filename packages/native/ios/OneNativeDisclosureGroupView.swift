import SwiftUI
import UIKit

private final class DisclosureGroupModel: ObservableObject {
  @Published var controlled = OneNativeControlled<Bool>(false)
  @Published var label = ""
  var active = false
  var onChange: ((Bool, Int, Int) -> Void)?

  func change(_ value: Bool) {
    guard active, controlled.value != value else { return }
    controlled.change(value)
    onChange?(value, controlled.eventCount, controlled.revision)
  }
}

private struct DisclosureGroupContent: View {
  @ObservedObject var model: DisclosureGroupModel
  @ObservedObject var children: OneNativeChildren

  var body: some View {
    DisclosureGroup(isExpanded: Binding(
      get: { model.controlled.value },
      set: { value in model.change(value) }
    )) {
      ForEach(children.items) { child in child.content }
    } label: {
      Text(model.label)
    }
  }
}

@objcMembers
public final class OneNativeDisclosureGroupView: OneNativeContainerView {
  public var onChange: ((Bool, Int, Int) -> Void)?
  private let model: DisclosureGroupModel

  public init() {
    let model = DisclosureGroupModel()
    self.model = model
    super.init(wrap: { children, _ in
      AnyView(DisclosureGroupContent(model: model, children: children))
    })
    model.onChange = { [weak self] value, count, revision in
      self?.onChange?(value, count, revision)
    }
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) is unavailable") }

  public func configure(
    label: String, isExpanded: Bool, acknowledgedEvent: Int, revision: Int
  ) {
    if let next = model.controlled.applying(
      isExpanded, acknowledged: acknowledgedEvent, revision: revision
    ) { model.controlled = next }
    if model.label != label { model.label = label }
  }

  public override func setActive(_ active: Bool) { model.active = active }

  public override func reset() {
    model.active = false
    model.controlled = OneNativeControlled<Bool>(false)
    model.label = ""
    super.reset()
  }
}
