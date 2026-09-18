import SwiftUI
import UIKit

private final class ListModel: ObservableObject {
  @Published var listStyle = "automatic"
}

private struct ListContent: View {
  @ObservedObject var model: ListModel
  @ObservedObject var children: OneNativeChildren

  var body: some View {
    List {
      ForEach(children.items) { child in child.content }
    }
    .oneNativeListStyle(model.listStyle)
  }
}

@objcMembers
public final class OneNativeListView: OneNativeContainerView {
  private let model: ListModel

  public init() {
    let model = ListModel()
    self.model = model
    super.init(wrap: { children, _ in
      AnyView(ListContent(model: model, children: children))
    })
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) is unavailable") }

  public func configure(listStyle: String) {
    if model.listStyle != listStyle { model.listStyle = listStyle }
  }
}
