import SwiftUI
import UIKit

private final class GlassModel: ObservableObject {
  // a glass surface is the same style vocabulary a control takes, so the container assembles
  // one and the shared style chain draws it. nothing else in the style is set.
  @Published var style = OneNativeStyle()
  @Published var colorScheme = ""
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
    // outside the style chain, so the glass surface draws in it along with the children.
    .oneNativeColorScheme(model.colorScheme)
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
    material: String, glassEffect: String, interactive: Bool, shape: String,
    cornerRadius: Double, tint: UIColor?, colorScheme: String
  ) {
    var next = OneNativeStyle()
    if !material.isEmpty { next.material = material }
    if !glassEffect.isEmpty { next.glassEffect = glassEffect }
    next.glassEffectInteractive = interactive
    if !shape.isEmpty { next.glassEffectShape = shape }
    // negative is how React Native says the caller left the radius out, which keeps the
    // glass on the shape SwiftUI picks for its size.
    if cornerRadius >= 0 { next.cornerRadius = CGFloat(cornerRadius) }
    next.glassEffectTint = tint
    if model.style != next { model.style = next }
    if model.colorScheme != colorScheme { model.colorScheme = colorScheme }
  }
}

extension View {
  // liquid glass on iOS 26, and a material surface below it. glass wins when both are set:
  // it is the newer surface, and a caller that named one asked for the glass.
  @ViewBuilder func oneNativeGlassEffect(_ style: OneNativeStyle) -> some View {
    #if os(iOS)
    if #available(iOS 26.0, *), let name = style.glassEffect {
      let glass = OneNativeStyle.resolveGlassEffect(name)
        .interactive(style.glassEffectInteractive ?? false)
        .tint(style.glassEffectTint.map { Color(uiColor: $0) })
      switch style.glassEffectShape?.lowercased() {
      case "capsule": self.glassEffect(glass, in: Capsule())
      case "circle": self.glassEffect(glass, in: Circle())
      case "containerrelativeshape": self.glassEffect(glass, in: ContainerRelativeShape())
      case "ellipse": self.glassEffect(glass, in: Ellipse())
      case "rectangle": self.glassEffect(glass, in: Rectangle())
      case "roundedrectangle":
        self.glassEffect(glass, in: RoundedRectangle(cornerRadius: style.cornerRadius ?? 0))
      case nil:
        if let radius = style.cornerRadius {
          self.glassEffect(glass, in: RoundedRectangle(cornerRadius: radius))
        } else {
          self.glassEffect(glass)
        }
      default:
        let _ = preconditionFailure("invalid GlassEffectShape: \(style.glassEffectShape ?? "")")
        self
      }
    } else if let material = style.material {
      self.background(OneNativeStyle.resolveMaterial(material))
    } else {
      self
    }
    #else
    self
    #endif
  }
}

extension OneNativeStyle {
  @available(iOS 26.0, *)
  static func resolveGlassEffect(_ string: String) -> Glass {
    switch string.lowercased() {
    case "regular": return .regular
    case "clear": return .clear
    case "identity": return .identity
    default: preconditionFailure("invalid GlassEffect: \(string)")
    }
  }

  static func resolveMaterial(_ string: String) -> Material {
    switch string.lowercased() {
    case "ultrathin": return .ultraThin
    case "thin": return .thin
    case "regular": return .regular
    case "thick": return .thick
    case "ultrathick": return .ultraThick
    default: preconditionFailure("invalid Material: \(string)")
    }
  }
}
