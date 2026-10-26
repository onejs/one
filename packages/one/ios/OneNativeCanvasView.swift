import SwiftUI
import UIKit

// SwiftUI's Canvas. its renderer closure runs in React against a recording context
// (canvas.ts), and the recorded GraphicsContext calls arrive here as JSON and replay, in
// order, on the real context SwiftUI hands the renderer. the JSON is validated in React, so
// anything this file cannot read is a bug in the transport and stops the app.

private struct CanvasValues {
  let json: [String: Any]

  func number(_ key: String) -> Double {
    guard let value = json[key] as? NSNumber else { preconditionFailure("Swift.Canvas op needs a number for \(key)") }
    return value.doubleValue
  }

  func string(_ key: String) -> String {
    guard let value = json[key] as? String else { preconditionFailure("Swift.Canvas op needs a string for \(key)") }
    return value
  }

  func bool(_ key: String) -> Bool {
    guard let value = json[key] as? Bool else { preconditionFailure("Swift.Canvas op needs a boolean for \(key)") }
    return value
  }

  func values(_ key: String) -> CanvasValues {
    guard let value = json[key] as? [String: Any] else { preconditionFailure("Swift.Canvas op needs an object for \(key)") }
    return CanvasValues(json: value)
  }

  func list(_ key: String) -> [CanvasValues] {
    guard let value = json[key] as? [[String: Any]] else { preconditionFailure("Swift.Canvas op needs a list for \(key)") }
    return value.map(CanvasValues.init)
  }

  func numbers(_ key: String) -> [Double] {
    guard let value = json[key] as? [NSNumber] else { preconditionFailure("Swift.Canvas op needs numbers for \(key)") }
    return value.map(\.doubleValue)
  }

  func has(_ key: String) -> Bool { json[key] != nil }

  var point: CGPoint { CGPoint(x: number("x"), y: number("y")) }
  var rect: CGRect { CGRect(x: number("x"), y: number("y"), width: number("width"), height: number("height")) }
}

private func canvasColor(_ argb: Double) -> Color {
  let value = UInt32(truncatingIfNeeded: Int64(argb))
  return Color(
    .sRGB,
    red: Double((value >> 16) & 0xff) / 255, green: Double((value >> 8) & 0xff) / 255,
    blue: Double(value & 0xff) / 255, opacity: Double((value >> 24) & 0xff) / 255)
}

private func canvasPath(_ elements: [CanvasValues]) -> Path {
  var path = Path()
  for element in elements {
    func point(_ x: String, _ y: String) -> CGPoint { CGPoint(x: element.number(x), y: element.number(y)) }
    switch element.string("t") {
    case "move": path.move(to: point("x", "y"))
    case "line": path.addLine(to: point("x", "y"))
    case "quad": path.addQuadCurve(to: point("x", "y"), control: point("cx", "cy"))
    case "curve":
      path.addCurve(to: point("x", "y"), control1: point("c1x", "c1y"), control2: point("c2x", "c2y"))
    case "arc":
      path.addArc(
        center: point("cx", "cy"), radius: element.number("r"), startAngle: .radians(element.number("start")),
        endAngle: .radians(element.number("end")), clockwise: element.bool("clockwise"))
    case "rect":
      path.addRect(CGRect(x: element.number("x"), y: element.number("y"), width: element.number("w"), height: element.number("h")))
    case "roundedRect":
      let style: RoundedCornerStyle
      switch element.string("style") {
      case "circular": style = .circular
      case "continuous": style = .continuous
      default: preconditionFailure("Swift.Canvas unknown rounded corner style \(element.string("style"))")
      }
      path.addRoundedRect(
        in: CGRect(x: element.number("x"), y: element.number("y"), width: element.number("w"), height: element.number("h")),
        cornerSize: CGSize(width: element.number("cw"), height: element.number("ch")), style: style)
    case "ellipse":
      path.addEllipse(in: CGRect(x: element.number("x"), y: element.number("y"), width: element.number("w"), height: element.number("h")))
    case "close": path.closeSubpath()
    default: preconditionFailure("Swift.Canvas unknown path element \(element.string("t"))")
    }
  }
  return path
}

private func canvasGradient(_ shading: CanvasValues) -> Gradient {
  Gradient(stops: shading.list("stops").map { Gradient.Stop(color: canvasColor($0.number("color")), location: $0.number("location")) })
}

private func canvasShading(_ shading: CanvasValues) -> GraphicsContext.Shading {
  switch shading.string("kind") {
  case "color": return .color(canvasColor(shading.number("color")))
  case "linearGradient":
    return .linearGradient(
      canvasGradient(shading), startPoint: shading.values("start").point, endPoint: shading.values("end").point)
  case "radialGradient":
    return .radialGradient(
      canvasGradient(shading), center: shading.values("center").point,
      startRadius: shading.number("startRadius"), endRadius: shading.number("endRadius"))
  case "conicGradient":
    return .conicGradient(
      canvasGradient(shading), center: shading.values("center").point, angle: .radians(shading.number("angle")))
  default: preconditionFailure("Swift.Canvas unknown shading \(shading.string("kind"))")
  }
}

private func canvasFillStyle(_ style: CanvasValues) -> FillStyle {
  FillStyle(eoFill: style.bool("eoFill"), antialiased: style.bool("antialiased"))
}

private func canvasStrokeStyle(_ style: CanvasValues) -> StrokeStyle {
  let cap: CGLineCap
  switch style.string("lineCap") {
  case "butt": cap = .butt
  case "round": cap = .round
  case "square": cap = .square
  default: preconditionFailure("Swift.Canvas unknown lineCap \(style.string("lineCap"))")
  }
  let join: CGLineJoin
  switch style.string("lineJoin") {
  case "miter": join = .miter
  case "round": join = .round
  case "bevel": join = .bevel
  default: preconditionFailure("Swift.Canvas unknown lineJoin \(style.string("lineJoin"))")
  }
  return StrokeStyle(
    lineWidth: style.number("lineWidth"), lineCap: cap, lineJoin: join, miterLimit: style.number("miterLimit"),
    dash: style.numbers("dash").map { CGFloat($0) }, dashPhase: style.number("dashPhase"))
}

private func canvasFontWeight(_ name: String) -> Font.Weight {
  switch name {
  case "ultraLight": return .ultraLight
  case "thin": return .thin
  case "light": return .light
  case "regular": return .regular
  case "medium": return .medium
  case "semibold": return .semibold
  case "bold": return .bold
  case "heavy": return .heavy
  case "black": return .black
  default: preconditionFailure("Swift.Canvas unknown fontWeight \(name)")
  }
}

private func canvasBlendMode(_ name: String) -> GraphicsContext.BlendMode {
  switch name {
  case "normal": return .normal
  case "multiply": return .multiply
  case "screen": return .screen
  case "overlay": return .overlay
  case "darken": return .darken
  case "lighten": return .lighten
  case "colorDodge": return .colorDodge
  case "colorBurn": return .colorBurn
  case "softLight": return .softLight
  case "hardLight": return .hardLight
  case "difference": return .difference
  case "exclusion": return .exclusion
  case "hue": return .hue
  case "saturation": return .saturation
  case "color": return .color
  case "luminosity": return .luminosity
  case "clear": return .clear
  case "copy": return .copy
  case "sourceIn": return .sourceIn
  case "sourceOut": return .sourceOut
  case "sourceAtop": return .sourceAtop
  case "destinationOver": return .destinationOver
  case "destinationIn": return .destinationIn
  case "destinationOut": return .destinationOut
  case "destinationAtop": return .destinationAtop
  case "xor": return .xor
  case "plusDarker": return .plusDarker
  case "plusLighter": return .plusLighter
  default: preconditionFailure("Swift.Canvas unknown blendMode \(name)")
  }
}

private func canvasDraw(_ op: CanvasValues, _ context: inout GraphicsContext) {
  let item = op.values("item")
  let anchor = op.has("anchor") ? op.values("anchor").point : .zero
  switch item.string("kind") {
  case "text":
    var text = Text(item.string("text")).fontWeight(canvasFontWeight(item.string("fontWeight")))
    let size = item.number("fontSize")
    if size > 0 { text = text.font(.system(size: size)) }
    if item.has("color") { text = text.foregroundStyle(canvasColor(item.number("color"))) }
    if op.has("in") { context.draw(text, in: op.values("in").rect) }
    else { context.draw(text, at: op.values("at").point, anchor: UnitPoint(x: anchor.x, y: anchor.y)) }
  case "symbol":
    var image = context.resolve(Image(systemName: item.string("systemName")))
    if item.has("color") { image.shading = .color(canvasColor(item.number("color"))) }
    if op.has("in") { context.draw(image, in: op.values("in").rect) }
    else { context.draw(image, at: op.values("at").point, anchor: UnitPoint(x: anchor.x, y: anchor.y)) }
  default: preconditionFailure("Swift.Canvas unknown draw item \(item.string("kind"))")
  }
}

private func canvasReplay(_ ops: [CanvasValues], _ context: inout GraphicsContext) {
  for op in ops {
    switch op.string("op") {
    case "fill":
      context.fill(canvasPath(op.list("path")), with: canvasShading(op.values("shading")), style: canvasFillStyle(op.values("style")))
    case "stroke":
      context.stroke(canvasPath(op.list("path")), with: canvasShading(op.values("shading")), style: canvasStrokeStyle(op.values("style")))
    case "draw": canvasDraw(op, &context)
    case "clip": context.clip(to: canvasPath(op.list("path")), style: canvasFillStyle(op.values("style")))
    case "translate": context.translateBy(x: op.number("x"), y: op.number("y"))
    case "scale": context.scaleBy(x: op.number("x"), y: op.number("y"))
    case "rotate": context.rotate(by: .radians(op.number("radians")))
    case "opacity": context.opacity = op.number("value")
    case "blendMode": context.blendMode = canvasBlendMode(op.string("mode"))
    case "layer":
      let layerOps = op.list("ops")
      context.drawLayer { layer in canvasReplay(layerOps, &layer) }
    default: preconditionFailure("Swift.Canvas unknown operation \(op.string("op"))")
    }
  }
}

private final class CanvasModel: ObservableObject {
  @Published private(set) var ops: [CanvasValues] = []
  @Published var opaque = false
  @Published var colorMode = ColorRenderingMode.nonLinear
  @Published var rendersAsynchronously = false
  private var opsJSON = "[]"
  var active = false
  var latest: CGSize?
  var onSize: ((CGSize) -> Void)?

  func configure(ops json: String, colorMode name: String) {
    if json != opsJSON {
      guard let data = json.data(using: .utf8),
        let parsed = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]]
      else { preconditionFailure("invalid Swift.Canvas ops \(json)") }
      ops = parsed.map(CanvasValues.init)
      opsJSON = json
    }
    let mode: ColorRenderingMode
    switch name {
    case "nonLinear": mode = .nonLinear
    case "linear": mode = .linear
    case "extendedLinear": mode = .extendedLinear
    default: preconditionFailure("invalid Swift.Canvas colorMode \(name)")
    }
    if colorMode != mode { colorMode = mode }
  }

  func emit(_ size: CGSize) {
    latest = size
    if active { onSize?(size) }
  }

  func setActive(_ active: Bool) {
    self.active = active
    if active, let latest { onSize?(latest) }
  }
}

private struct CanvasContent: View {
  @ObservedObject var model: CanvasModel
  @ObservedObject var style: OneNativeContainerStyle
  let standalone: Bool
  @ObservedObject var bridge: OneNativeSchemeBridge

  var body: some View {
    let ops = model.ops
    Canvas(opaque: model.opaque, colorMode: model.colorMode, rendersAsynchronously: model.rendersAsynchronously) {
      context, _ in
      canvasReplay(ops, &context)
    }
    .onGeometryChange(for: CGSize.self) { $0.size } action: { size in model.emit(size) }
    .oneNativeContainerStyle(style)
    .oneNativeScheme(standalone, bridge.scheme)
  }
}

@objcMembers
public final class OneNativeCanvasView: OneNativeContainerView {
  public var onSize: ((CGFloat, CGFloat) -> Void)?
  private let model: CanvasModel
  private let bridge: OneNativeSchemeBridge
  private var traitRegistration: NSObjectProtocol?

  public init() {
    let model = CanvasModel()
    let bridge = OneNativeSchemeBridge()
    self.model = model
    self.bridge = bridge
    super.init(styled: { _, style, standalone in
      AnyView(CanvasContent(model: model, style: style, standalone: standalone, bridge: bridge))
    })
    model.onSize = { [weak self] size in self?.onSize?(size.width, size.height) }
    traitRegistration = registerForTraitChanges([UITraitUserInterfaceStyle.self]) {
      [weak bridge] (view: OneNativeCanvasView, _: UITraitCollection) in
      bridge?.sync(view.traitCollection)
    }
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) is unavailable") }

  public override func didMoveToWindow() {
    bridge.sync(traitCollection)
    super.didMoveToWindow()
  }

  public func configure(ops: String, opaque: Bool, colorMode: String, rendersAsynchronously: Bool) {
    model.configure(ops: ops, colorMode: colorMode)
    if model.opaque != opaque { model.opaque = opaque }
    if model.rendersAsynchronously != rendersAsynchronously { model.rendersAsynchronously = rendersAsynchronously }
  }

  public override func setActive(_ active: Bool) { model.setActive(active) }

  public override func reset() {
    model.active = false
    model.latest = nil
    super.reset()
  }
}
