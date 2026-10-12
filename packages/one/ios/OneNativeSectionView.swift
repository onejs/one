import SwiftUI
import UIKit

private final class SectionModel: ObservableObject {
  @Published var title = ""
  @Published var footer = ""
  @Published var swiftStyle = OneNativeStyle()
  var active = false
  var onSDKEvent: ((String, String) -> Void)?
  func emitSDKEvent(_ name: String, _ value: String) {
    if active { onSDKEvent?(name, value) }
  }
}

private struct SectionContent: View {
  @ObservedObject var model: SectionModel
  @ObservedObject var children: OneNativeChildren

  var body: some View {
    Section {
      ForEach(children.items) { child in child.content }
    } header: {
      if !model.title.isEmpty { Text(model.title) }
    } footer: {
      if !model.footer.isEmpty { Text(model.footer) }
    }
    .oneNativeStyle(model.swiftStyle, emit: model.emitSDKEvent)
  }
}

@objcMembers
public final class OneNativeSectionView: OneNativeContainerView {
  public var onSDKEvent: ((String, String) -> Void)?
  private let model: SectionModel

  public init() {
    let model = SectionModel()
    self.model = model
    super.init(wrap: { children, _ in
      AnyView(SectionContent(model: model, children: children))
    })
    model.onSDKEvent = { [weak self] name, value in self?.onSDKEvent?(name, value) }
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) is unavailable") }

  public func configure(title: String, footer: String) {
    if model.title != title { model.title = title }
    if model.footer != footer { model.footer = footer }
  }

  public func configureStyle(_ style: [String: Any]) {
    let next = OneNativeStyle(dictionary: style)
    if model.swiftStyle != next {
      let previousSections = model.swiftStyle.sdkModifiers.filter {
        $0.first?.hasPrefix("listSection") == true || $0.first == "headerProminence"
      }
      let nextSections = next.sdkModifiers.filter {
        $0.first?.hasPrefix("listSection") == true || $0.first == "headerProminence"
      }
      model.swiftStyle = next
      if previousSections != nextSections { refreshComposedIdentity() }
    }
  }

  public override func setActive(_ active: Bool) { model.active = active }

  public override func reset() {
    model.title = ""
    model.footer = ""
    model.swiftStyle = OneNativeStyle()
    super.reset()
  }
}
