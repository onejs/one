import { styleFields } from './catalog'

export function emitStyle(header: string, outputs: Map<string, string>) {
  const properties = styleFields
    .map((field) => {
      switch (field.kind) {
        case 'number':
          return `  public var ${field.name}: CGFloat?`
        case 'string':
          return `  public var ${field.name}: String?`
        case 'color':
          return `  public var ${field.name}: UIColor?`
      }
    })
    .join('\n')

  const dictionaryParsers = styleFields
    .map((field) => {
      switch (field.kind) {
        case 'number':
          return `    if let v = dictionary["${field.name}"] as? Double { self.${field.name} = CGFloat(v) }`
        case 'string':
          return `    if let v = dictionary["${field.name}"] as? String, !v.isEmpty { self.${field.name} = v }`
        case 'color':
          return `    if let v = dictionary["${field.name}"] as? UIColor { self.${field.name} = v }`
      }
    })
    .join('\n')

  outputs.set(
    'ios/OneNativeStyle.swift',
    header +
      `import SwiftUI
import UIKit

public struct OneNativeStyle: Equatable {
${properties}

  public init() {}

  public init(dictionary: [String: Any]) {
${dictionaryParsers}
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
      if p < 0 {
        preconditionFailure("invalid padding: \\(p)")
      }
      self.padding(p)
    } else if style.paddingTop != nil || style.paddingLeading != nil || style.paddingBottom != nil || style.paddingTrailing != nil {
      let top = style.paddingTop ?? 0
      let leading = style.paddingLeading ?? 0
      let bottom = style.paddingBottom ?? 0
      let trailing = style.paddingTrailing ?? 0
      if top < 0 || leading < 0 || bottom < 0 || trailing < 0 {
        preconditionFailure("invalid padding insets: (\\(top), \\(leading), \\(bottom), \\(trailing))")
      }
      self.padding(EdgeInsets(top: top, leading: leading, bottom: bottom, trailing: trailing))
    } else {
      self
    }
  }

  @ViewBuilder fileprivate func oneNativeFrame(_ style: OneNativeStyle) -> some View {
    let hasExact = style.width != nil || style.height != nil
    let hasFlexible = style.minWidth != nil || style.idealWidth != nil || style.maxWidth != nil ||
                      style.minHeight != nil || style.idealHeight != nil || style.maxHeight != nil
    if hasExact && hasFlexible {
      self.frame(
        minWidth: style.minWidth,
        idealWidth: style.idealWidth,
        maxWidth: style.maxWidth,
        minHeight: style.minHeight,
        idealHeight: style.idealHeight,
        maxHeight: style.maxHeight
      ).frame(width: style.width, height: style.height)
    } else if hasExact {
      self.frame(width: style.width, height: style.height)
    } else if hasFlexible {
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
    if let radius = radius {
      if radius < 0 {
        preconditionFailure("invalid cornerRadius: \\(radius)")
      }
      self.clipShape(RoundedRectangle(cornerRadius: radius))
    } else {
      self
    }
  }

  @ViewBuilder fileprivate func oneNativeOpacity(_ opacity: CGFloat?) -> some View {
    if let opacity = opacity {
      if opacity < 0.0 || opacity > 1.0 {
        preconditionFailure("invalid opacity: \\(opacity)")
      }
      self.opacity(Double(opacity))
    } else {
      self
    }
  }

  @ViewBuilder fileprivate func oneNativeBorder(color: UIColor?, width: CGFloat?) -> some View {
    if let color = color {
      let w = width ?? 1
      if w < 0 {
        preconditionFailure("invalid borderWidth: \\(w)")
      }
      self.border(Color(uiColor: color), width: w)
    } else if let width = width {
      if width < 0 {
        preconditionFailure("invalid borderWidth: \\(width)")
      }
      self
    } else {
      self
    }
  }
}

extension OneNativeStyle {
  func resolveFont() -> Font? {
    let weight = fontWeight.map(OneNativeStyle.resolveWeight)
    let design = fontDesign.map(OneNativeStyle.resolveDesign)

    if let size = fontSize {
      if size <= 0 {
        preconditionFailure("invalid fontSize: \\(size)")
      }
      return Font.system(size: size, weight: weight, design: design)
    }
    if let textStyleStr = textStyle {
      let textStyle = OneNativeStyle.resolveTextStyle(textStyleStr)
      return Font.system(textStyle, design: design, weight: weight)
    }
    if weight != nil || design != nil {
      return Font.system(size: UIFont.buttonFontSize, weight: weight, design: design)
    }
    return nil
  }

  static func resolveWeight(_ string: String) -> Font.Weight {
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
    default: preconditionFailure("invalid FontWeight: \\(string)")
    }
  }

  static func resolveDesign(_ string: String) -> Font.Design {
    switch string.lowercased() {
    case "default": return .default
    case "serif": return .serif
    case "rounded": return .rounded
    case "monospaced": return .monospaced
    default: preconditionFailure("invalid FontDesign: \\(string)")
    }
  }

  static func resolveTextStyle(_ string: String) -> Font.TextStyle {
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
    default: preconditionFailure("invalid TextStyle: \\(string)")
    }
  }
}
`
  )
}
