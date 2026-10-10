import SwiftUI
import UIKit

private final class SwiftHostModel: ObservableObject {
  @Published var packageName = ""
  @Published var view = ""
  @Published var contractHash = ""
  @Published var propsText = ""
  @Published var fill = false
  var onHeight: ((CGFloat) -> Void)?
  var onEvent: ((String, String) -> Void)?
}

// a typed view (`public struct X: View`) from the package's generated dispatch
@MainActor private func typedView(_ model: SwiftHostModel) -> AnyView {
  let className = "OneNativeSourceViews_\(model.packageName)"
  guard let type = NSClassFromString(className) as? OneNativeSourceViewDispatch.Type else {
    return AnyView(Text("swift view \(model.packageName).\(model.view) is not linked into this app; rebuild it").foregroundStyle(.red))
  }
  let dispatch = type.init()
  guard dispatch.contractHash == model.contractHash else {
    return AnyView(Text("swift view \(model.packageName).\(model.view) changed; rebuild the app").foregroundStyle(.red))
  }
  do {
    return try dispatch.view(model.view, model.propsText) { [weak model] name, args in model?.onEvent?(name, args) }
  } catch {
    return AnyView(Text("\(model.view): \(error.localizedDescription)").foregroundStyle(.red))
  }
}

private struct SwiftHostContent: View {
  @ObservedObject var model: SwiftHostModel
  let standalone: Bool

  // the same view type on every props change, so the package's @State
  // survives it the way it survives a body re-evaluation
  var body: some View {
    Group {
      if !model.view.isEmpty {
        typedView(model)
      } else if let view = OneSwiftPackages.view(model.packageName) {
        view(JSON(parsing: model.propsText))
      } else {
        Text("swift package \(model.packageName) is not linked into this app")
          .foregroundStyle(.red)
      }
    }
    .frame(maxWidth: model.fill ? .infinity : nil, maxHeight: model.fill ? .infinity : nil)
    .oneNativeMeasured(standalone && !model.fill, model.onHeight)
  }
}

@objcMembers
public final class OneSwiftHostView: OneNativeContainerView {
  public var onMeasure: ((CGFloat) -> Void)?
  public var onEvent: ((String, String) -> Void)?
  private let model: SwiftHostModel

  @nonobjc override var hostingScreenInsets: Bool { model.fill }

  public init() {
    let model = SwiftHostModel()
    self.model = model
    super.init(wrap: { _, standalone in
      AnyView(SwiftHostContent(model: model, standalone: standalone))
    })
    model.onHeight = { [weak self] height in self?.onMeasure?(height) }
    model.onEvent = { [weak self] name, args in self?.onEvent?(name, args) }
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) is unavailable") }

  public func configure(packageName: String, view: String, contractHash: String, props: String, fill: Bool) {
    if model.packageName != packageName { model.packageName = packageName }
    if model.view != view { model.view = view }
    if model.contractHash != contractHash { model.contractHash = contractHash }
    if model.fill != fill {
      model.fill = fill
      updateHost()
    }
    if model.propsText != props { model.propsText = props }
  }
}
