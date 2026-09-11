import SwiftUI
import UIKit

public struct OneNativeStyle: Equatable {
  public var fontSize: CGFloat?
  public var fontWeight: String?
  public var fontDesign: String?
  public var textStyle: String?
  public var foregroundStyle: UIColor?
  public var tint: UIColor?
  public var background: UIColor?
  public var padding: CGFloat?
  public var paddingTop: CGFloat?
  public var paddingLeading: CGFloat?
  public var paddingBottom: CGFloat?
  public var paddingTrailing: CGFloat?
  public var width: CGFloat?
  public var height: CGFloat?
  public var minWidth: CGFloat?
  public var idealWidth: CGFloat?
  public var maxWidth: CGFloat?
  public var minHeight: CGFloat?
  public var idealHeight: CGFloat?
  public var maxHeight: CGFloat?
  public var cornerRadius: CGFloat?
  public var opacity: Double?
  public var borderColor: UIColor?
  public var borderWidth: CGFloat?

  public init(
    fontSize: CGFloat? = nil,
    fontWeight: String? = nil,
    fontDesign: String? = nil,
    textStyle: String? = nil,
    foregroundStyle: UIColor? = nil,
    tint: UIColor? = nil,
    background: UIColor? = nil,
    padding: CGFloat? = nil,
    paddingTop: CGFloat? = nil,
    paddingLeading: CGFloat? = nil,
    paddingBottom: CGFloat? = nil,
    paddingTrailing: CGFloat? = nil,
    width: CGFloat? = nil,
    height: CGFloat? = nil,
    minWidth: CGFloat? = nil,
    idealWidth: CGFloat? = nil,
    maxWidth: CGFloat? = nil,
    minHeight: CGFloat? = nil,
    idealHeight: CGFloat? = nil,
    maxHeight: CGFloat? = nil,
    cornerRadius: CGFloat? = nil,
    opacity: Double? = nil,
    borderColor: UIColor? = nil,
    borderWidth: CGFloat? = nil
  ) {
    self.fontSize = fontSize
    self.fontWeight = fontWeight
    self.fontDesign = fontDesign
    self.textStyle = textStyle
    self.foregroundStyle = foregroundStyle
    self.tint = tint
    self.background = background
    self.padding = padding
    self.paddingTop = paddingTop
    self.paddingLeading = paddingLeading
    self.paddingBottom = paddingBottom
    self.paddingTrailing = paddingTrailing
    self.width = width
    self.height = height
    self.minWidth = minWidth
    self.idealWidth = idealWidth
    self.maxWidth = maxWidth
    self.minHeight = minHeight
    self.idealHeight = idealHeight
    self.maxHeight = maxHeight
    self.cornerRadius = cornerRadius
    self.opacity = opacity
    self.borderColor = borderColor
    self.borderWidth = borderWidth
  }

  public init(dictionary: [String: Any]) {
    if let v = dictionary["fontSize"] as? Double { self.fontSize = CGFloat(v) }
    if let v = dictionary["fontWeight"] as? String, !v.isEmpty { self.fontWeight = v }
    if let v = dictionary["fontDesign"] as? String, !v.isEmpty { self.fontDesign = v }
    if let v = dictionary["textStyle"] as? String, !v.isEmpty { self.textStyle = v }
    if let v = dictionary["foregroundStyle"] as? UIColor { self.foregroundStyle = v }
    if let v = dictionary["tint"] as? UIColor { self.tint = v }
    if let v = dictionary["background"] as? UIColor { self.background = v }
    if let v = dictionary["padding"] as? Double { self.padding = CGFloat(v) }
    if let v = dictionary["paddingTop"] as? Double { self.paddingTop = CGFloat(v) }
    if let v = dictionary["paddingLeading"] as? Double { self.paddingLeading = CGFloat(v) }
    if let v = dictionary["paddingBottom"] as? Double { self.paddingBottom = CGFloat(v) }
    if let v = dictionary["paddingTrailing"] as? Double { self.paddingTrailing = CGFloat(v) }
    if let v = dictionary["width"] as? Double { self.width = CGFloat(v) }
    if let v = dictionary["height"] as? Double { self.height = CGFloat(v) }
    if let v = dictionary["minWidth"] as? Double { self.minWidth = CGFloat(v) }
    if let v = dictionary["idealWidth"] as? Double { self.idealWidth = CGFloat(v) }
    if let v = dictionary["maxWidth"] as? Double { self.maxWidth = CGFloat(v) }
    if let v = dictionary["minHeight"] as? Double { self.minHeight = CGFloat(v) }
    if let v = dictionary["idealHeight"] as? Double { self.idealHeight = CGFloat(v) }
    if let v = dictionary["maxHeight"] as? Double { self.maxHeight = CGFloat(v) }
    if let v = dictionary["cornerRadius"] as? Double { self.cornerRadius = CGFloat(v) }
    if let v = dictionary["opacity"] as? Double { self.opacity = v }
    if let v = dictionary["borderColor"] as? UIColor { self.borderColor = v }
    if let v = dictionary["borderWidth"] as? Double { self.borderWidth = CGFloat(v) }
  }
}

extension View {
  public func oneNativeStyle(_ style: OneNativeStyle) -> some View {
    self
      .oneNativeFont(style)
      .oneNativeForegroundStyle(style.foregroundStyle)
      .oneNativeTint(style.tint)
      .oneNativePadding(style)
      .oneNativeFrame(style)
      .oneNativeBackground(style.background)
      .oneNativeCornerRadius(style.cornerRadius)
      .oneNativeOpacity(style.opacity)
      .oneNativeBorder(color: style.borderColor, width: style.borderWidth)
  }

  @ViewBuilder fileprivate func oneNativeFont(_ style: OneNativeStyle) -> some View {
    if let font = style.resolveFont() {
      self.font(font)
    } else {
      self
    }
  }

  @ViewBuilder fileprivate func oneNativeForegroundStyle(_ color: UIColor?) -> some View {
    if let color = color {
      self.foregroundStyle(Color(uiColor: color))
    } else {
      self
    }
  }

  @ViewBuilder fileprivate func oneNativeTint(_ color: UIColor?) -> some View {
    if let color = color {
      self.tint(Color(uiColor: color))
    } else {
      self
    }
  }

  @ViewBuilder fileprivate func oneNativePadding(_ style: OneNativeStyle) -> some View {
    if let p = style.padding {
      self.padding(p)
    } else if style.paddingTop != nil || style.paddingLeading != nil || style.paddingBottom != nil || style.paddingTrailing != nil {
      self.padding(EdgeInsets(
        top: style.paddingTop ?? 0,
        leading: style.paddingLeading ?? 0,
        bottom: style.paddingBottom ?? 0,
        trailing: style.paddingTrailing ?? 0
      ))
    } else {
      self
    }
  }

  @ViewBuilder fileprivate func oneNativeFrame(_ style: OneNativeStyle) -> some View {
    if style.width != nil || style.height != nil {
      self.frame(width: style.width, height: style.height)
    } else if style.minWidth != nil || style.idealWidth != nil || style.maxWidth != nil ||
              style.minHeight != nil || style.idealHeight != nil || style.maxHeight != nil {
      self.frame(
        minWidth: style.minWidth,
        idealWidth: style.idealWidth,
        maxWidth: style.maxWidth,
        minHeight: style.minHeight,
        idealHeight: style.idealHeight,
        maxHeight: style.maxHeight
      )
    } else {
      self
    }
  }

  @ViewBuilder fileprivate func oneNativeBackground(_ color: UIColor?) -> some View {
    if let color = color {
      self.background(Color(uiColor: color))
    } else {
      self
    }
  }

  @ViewBuilder fileprivate func oneNativeCornerRadius(_ radius: CGFloat?) -> some View {
    if let radius = radius, radius > 0 {
      self.clipShape(RoundedRectangle(cornerRadius: radius))
    } else {
      self
    }
  }

  @ViewBuilder fileprivate func oneNativeOpacity(_ opacity: Double?) -> some View {
    if let opacity = opacity, opacity >= 0.0 && opacity <= 1.0 {
      self.opacity(opacity)
    } else {
      self
    }
  }

  @ViewBuilder fileprivate func oneNativeBorder(color: UIColor?, width: CGFloat?) -> some View {
    if let color = color {
      self.border(Color(uiColor: color), width: width ?? 1)
    } else {
      self
    }
  }
}

extension OneNativeStyle {
  func resolveFont() -> Font? {
    let weight = fontWeight.flatMap(OneNativeStyle.resolveWeight)
    let design = fontDesign.flatMap(OneNativeStyle.resolveDesign)

    if let size = fontSize, size > 0 {
      return Font.system(size: size, weight: weight, design: design)
    }
    if let textStyleStr = textStyle, let textStyle = OneNativeStyle.resolveTextStyle(textStyleStr) {
      return Font.system(textStyle, design: design, weight: weight)
    }
    if weight != nil || design != nil {
      return Font.system(size: UIFont.buttonFontSize, weight: weight, design: design)
    }
    return nil
  }

  static func resolveWeight(_ string: String) -> Font.Weight? {
    switch string.lowercased() {
    case "ultralight": return .ultraLight
    case "thin": return .thin
    case "light": return .light
    case "regular": return .regular
    case "medium": return .medium
    case "semibold": return .semibold
    case "bold": return .bold
    case "heavy": return .heavy
    case "black": return .black
    default: return nil
    }
  }

  static func resolveDesign(_ string: String) -> Font.Design? {
    switch string.lowercased() {
    case "default": return .default
    case "serif": return .serif
    case "rounded": return .rounded
    case "monospaced": return .monospaced
    default: return nil
    }
  }

  static func resolveTextStyle(_ string: String) -> Font.TextStyle? {
    switch string.lowercased() {
    case "largetitle": return .largeTitle
    case "title": return .title
    case "title2": return .title2
    case "title3": return .title3
    case "headline": return .headline
    case "subheadline": return .subheadline
    case "body": return .body
    case "callout": return .callout
    case "footnote": return .footnote
    case "caption": return .caption
    case "caption2": return .caption2
    default: return nil
    }
  }
}
