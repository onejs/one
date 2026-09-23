import SwiftUI
import UIKit

private final class SwiftHostModel: ObservableObject {
  @Published var packageName = ""
  @Published var props: JSON = .null
  var onHeight: ((CGFloat) -> Void)?
}

private struct SwiftHostContent: View {
  @ObservedObject var model: SwiftHostModel
  let standalone: Bool

  // the same view type on every props change, so the package's @State
  // survives it the way it survives a body re-evaluation
  var body: some View {
    Group {
      if let view = OneSwiftPackages.view(model.packageName) {
        view(model.props)
      } else {
        Text("swift package \(model.packageName) is not linked into this app")
          .foregroundStyle(.red)
      }
    }
    .oneNativeMeasured(standalone, model.onHeight)
  }
}

@objcMembers
public final class OneSwiftHostView: OneNativeContainerView {
  public var onMeasure: ((CGFloat) -> Void)?
  private let model: SwiftHostModel
  private var propsText = ""

  public init() {
    let model = SwiftHostModel()
    self.model = model
    super.init(wrap: { _, standalone in
      AnyView(SwiftHostContent(model: model, standalone: standalone))
    })
    model.onHeight = { [weak self] height in self?.onMeasure?(height) }
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) is unavailable") }

  public func configure(packageName: String, props: String) {
    if model.packageName != packageName { model.packageName = packageName }
    if propsText != props {
      propsText = props
      model.props = JSON(parsing: props)
    }
  }
}
