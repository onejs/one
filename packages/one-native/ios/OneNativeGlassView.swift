import SwiftUI
import UIKit

private final class GlassModel: ObservableObject {
  // a glass surface is the same style vocabulary a control takes, so the container assembles
  // one and the shared style chain draws it. nothing else in the style is set.
  @Published var style = OneNativeStyle()
}

private struct GlassContent: View {
  @ObservedObject var model: GlassModel
  @ObservedObject var children: OneNativeChildren

  var body: some View {
    VStack(alignment: .leading, spacing: 0) {
      ForEach(children.items) { child in child.content }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    .oneNativeStyle(model.style)
  }
}

// a glass box: it draws the surface React Native asked for and lays the composed children
// out on top of it. it takes the box it is given, so it needs a height or a flex parent.
@objcMembers
public final class OneNativeGlassView: OneNativeContainerView {
  private let model: GlassModel

  public init() {
    let model = GlassModel()
    self.model = model
    super.init(wrap: { children, _ in
      AnyView(GlassContent(model: model, children: children))
    })
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) is unavailable") }

  public func configure(
    material: String, glassEffect: String, cornerRadius: Double, tint: UIColor?
  ) {
    var next = OneNativeStyle()
    if !material.isEmpty { next.material = material }
    if !glassEffect.isEmpty { next.glassEffect = glassEffect }
    // negative is how React Native says the caller left the radius out, which keeps the
    // glass on the shape SwiftUI picks for its size.
    if cornerRadius >= 0 { next.cornerRadius = CGFloat(cornerRadius) }
    next.tint = tint
    if model.style != next { model.style = next }
  }
}
