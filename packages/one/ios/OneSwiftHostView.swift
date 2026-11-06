import SwiftUI
import UIKit

private final class SwiftHostModel: ObservableObject {
  @Published var packageName = ""
  @Published var view = ""
  @Published var contractHash = ""
  @Published var propsText = ""
  @Published var fill = false
  // a typed view's decoded props live here, on the host view, so they outlive
  // every SwiftUI body evaluation; `revision` re-renders after they change
  @Published var revision = 0
  var held: AnyObject?
  var document = ""
  var failure: String?
  var dispatch: OneNativeSourceViewDispatch?
  var onHeight: ((CGFloat) -> Void)?
  var onEvent: ((String, String) -> Void)?
}

// a typed view (`public struct X: View`) from the package's generated dispatch
@MainActor private func typedView(_ model: SwiftHostModel) -> AnyView {
  if let failure = model.failure {
    return AnyView(Text(failure).foregroundStyle(.red))
  }
  guard let dispatch = model.dispatch, let held = model.held else { return AnyView(EmptyView()) }
  do {
    return try dispatch.buildView(held, model.view) { [weak model] name, args in model?.onEvent?(name, args) }
  } catch {
    return AnyView(Text("\(model.view): \(error.localizedDescription)").foregroundStyle(.red))
  }
}

// applies a props document to the held props. a change that does not follow
// them is refused, and javascript answers the resync event with every prop.
@MainActor private func applyDocument(_ model: SwiftHostModel, _ text: String) {
  model.failure = nil
  if model.dispatch == nil {
    let className = "OneNativeSourceViews_\(model.packageName)"
    guard let type = NSClassFromString(className) as? OneNativeSourceViewDispatch.Type else {
      model.failure = "swift view \(model.packageName).\(model.view) is not linked into this app; rebuild it"
      model.revision += 1
      return
    }
    model.dispatch = type.init()
  }
  guard let dispatch = model.dispatch, dispatch.contractHash == model.contractHash else {
    model.failure = "swift view \(model.packageName).\(model.view) changed; rebuild the app"
    model.revision += 1
    return
  }
  do {
    if let held = try dispatch.updateView(model.held, model.view, text) {
      model.held = held
      model.revision += 1
    } else {
      model.onEvent?("$resync", "[]")
    }
  } catch {
    model.failure = "\(model.view): \(error.localizedDescription)"
    model.revision += 1
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
    let changed = model.packageName != packageName || model.view != view || model.contractHash != contractHash
    if model.packageName != packageName { model.packageName = packageName }
    if model.view != view { model.view = view }
    if model.contractHash != contractHash { model.contractHash = contractHash }
    if model.fill != fill {
      model.fill = fill
      updateHost()
    }
    if view.isEmpty {
      if model.propsText != props { model.propsText = props }
      return
    }
    if changed {
      model.held = nil
      model.dispatch = nil
      model.document = ""
    }
    // fabric may deliver the same text again; a change document applies once
    if model.document == props { return }
    model.document = props
    applyDocument(model, props)
  }
}
