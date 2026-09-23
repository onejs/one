import type { StyleField } from './catalog'
import type { DerivedModifier, DerivedViewSlot } from './deriveSDK'

export function emitStyle(
  header: string,
  outputs: Map<string, string>,
  styleFields: readonly StyleField[],
  derived: readonly DerivedModifier[],
  slots: readonly DerivedViewSlot[]
) {
  outputs.set('src/generated/viewSlots.ts', header + `export const tabViewSlotAvailability = ${JSON.stringify(Object.fromEntries(slots.map((slot) => [slot.name, slot.ios])))} as const
export type TabViewSlotName = keyof typeof tabViewSlotAvailability
`)
  outputs.set('ios/Generated/OneNativeViewSlots.swift', header + `import SwiftUI

enum OneNativeViewSlotName {
${slots.map((slot) => `  static let ${slot.name} = ${JSON.stringify(slot.name)}`).join('\n')}
  static let names = [${slots.map((slot) => slot.name).join(', ')}]
}

extension View {
  func oneNativeViewSlot(_ name: String, content: @escaping () -> AnyView) -> AnyView {
    switch name {
${slots.map((slot) => `    case OneNativeViewSlotName.${slot.name}:
      if #available(iOS ${slot.ios}, *) { return AnyView(self.${slot.name}(content: content)) }
      return AnyView(self)`).join('\n')}
    default: preconditionFailure("unknown view slot: \\(name)")
    }
  }
}
`)
  // fabric runs processColor only on a top-level ColorValue prop, through the view
  // config; a color inside a struct prop reaches the native parser raw, and it reads an
  // unprocessed string as clear. every swiftStyle color is processed on the way out.
  const colorFields = styleFields.filter((field) => field.kind === 'color')
  const frameworkImports = [
    ...new Set(
      derived.flatMap((modifier) => (modifier.framework ? [modifier.framework] : []))
    ),
  ]
  const generatedCalls = derived
    .map(
      (modifier) =>
        `      case ${JSON.stringify(modifier.name)}: view = AnyView(view.oneNativeSDK${modifier.name[0].toUpperCase() + modifier.name.slice(1)}(value, emit: emit))`
    )
    .join('\n')
  const generatedMethods = derived
    .map((modifier) => {
      const helper = `oneNativeSDK${modifier.name[0].toUpperCase() + modifier.name.slice(1)}`
      const apply = (value: string, version: number, fullArguments = false) => {
        const argument = !fullArguments && modifier.label && modifier.label !== '_' ? `${modifier.label}: ${value}` : value
        return version > 17
          ? `if #available(iOS ${version}, *) { self.${modifier.name}(${argument}) } else { self }`
          : `self.${modifier.name}(${argument})`
      }
      if (modifier.kind === 'event' || modifier.kind.startsWith('binding')) {
        const bridge = modifier.kind === 'event'
          ? `{ emit(${JSON.stringify(modifier.name)}, "") }`
          : `Binding(get: { ${modifier.kind === 'bindingBoolean' ? 'value == "true"' : 'value'} }, set: { emit(${JSON.stringify(modifier.name)}, String($0)) })`
        const validation = modifier.kind === 'bindingBoolean'
          ? `    let _ = precondition(value == "true" || value == "false", "invalid ${modifier.name}: \\(value)")\n`
          : ''
        const argumentsFromSDK = modifier.callArguments?.map((parameter) =>
          `${parameter.label === '_' ? '' : `${parameter.label}: `}${parameter.bridge ? bridge : parameter.defaultValue}`
        ).join(', ')
        return `  @ViewBuilder fileprivate func ${helper}(_ value: String, emit: @escaping (String, String) -> Void) -> some View {
${validation}    ${apply(argumentsFromSDK ?? bridge, modifier.ios, argumentsFromSDK !== undefined)}
  }`
      }
      if (modifier.zeroArgument) {
        return `  @ViewBuilder fileprivate func ${helper}(_ value: String, emit: @escaping (String, String) -> Void) -> some View {
    let _ = precondition(value == "true" || value == "false", "invalid ${modifier.name}: \\(value)")
    if value == "true" { ${apply('', modifier.ios)} } else { self }
  }`
      }
      if (modifier.kind === 'optionalBoolean' || modifier.kind === 'optionalNumber' || modifier.kind === 'optionalString') {
        const nil = `nil as ${modifier.type}`
        const parsed = modifier.kind === 'optionalBoolean'
          ? `if value == "true" || value == "false" { ${apply('value == "true"', modifier.ios)} } else { preconditionFailure("invalid ${modifier.name}: \\(value)") }`
          : modifier.kind === 'optionalNumber'
            ? `if let number = Double(value), number.isFinite {
      ${apply(modifier.type === 'CoreFoundation.CGFloat?' ? 'CGFloat(number)' : modifier.type === 'Swift.Float?' ? 'Float(number)' : modifier.type === 'Swift.Int?' ? 'Int(number)' : 'number', modifier.ios)}
    } else { preconditionFailure("invalid ${modifier.name}: \\(value)") }`
            : `if let data = value.data(using: .utf8), let decoded = try? JSONDecoder().decode(String.self, from: data) {
      ${apply(modifier.type === 'SwiftUICore.Text?' ? 'Text(decoded)' : 'decoded', modifier.ios)}
    } else { preconditionFailure("invalid ${modifier.name}: \\(value)") }`
        return `  @ViewBuilder fileprivate func ${helper}(_ value: String, emit: @escaping (String, String) -> Void) -> some View {
    if value == "null" { ${apply(nil, modifier.ios)} } else { ${parsed} }
  }`
      }
      if (modifier.cases) {
        return `  @ViewBuilder fileprivate func ${helper}(_ value: String, emit: @escaping (String, String) -> Void) -> some View {
    switch value {
${modifier.kind === 'optionalEnum' ? `      case "null": ${apply(`nil as ${modifier.type}`, modifier.ios)}` : ''}
${modifier.cases
  .map(
    (item) =>
      `      case ${JSON.stringify(item.name)}: ${apply(`${modifier.type.replace(/\?$/, '')}.${item.name}`, Math.max(modifier.ios, item.ios))}`
  )
  .join('\n')}
    default: preconditionFailure("invalid ${modifier.name}: \\(value)")
    }
  }`
      }
      const parsed =
        modifier.kind === 'boolean'
          ? `      let _ = precondition(value == "true" || value == "false", "invalid ${modifier.name}: \\(value)")
      ${apply('value == "true"', modifier.ios)}`
          : modifier.kind === 'number'
            ? `      if let number = Double(value), number.isFinite {
        ${apply(
          modifier.type === 'CoreFoundation.CGFloat'
            ? 'CGFloat(number)'
            : modifier.type === 'Swift.Float'
              ? 'Float(number)'
              : modifier.type === 'Swift.Int'
                ? 'Int(number)'
                : 'number',
          modifier.ios
        )}
      } else { preconditionFailure("invalid ${modifier.name}: \\(value)") }`
            : `      ${apply(modifier.type === 'SwiftUICore.Text' ? 'Text(value)' : 'value', modifier.ios)}`
      return `  @ViewBuilder fileprivate func ${helper}(_ value: String, emit: @escaping (String, String) -> Void) -> some View {
${parsed}
  }`
    })
    .join('\n\n')
  outputs.set(
    'src/generated/swiftStyleNative.ts',
    header +
      `import { processColor, type ColorValue, type ProcessedColorValue } from 'react-native'
import type { OneNativeStyle } from './controlTypes'

export type OneNativeStyleNative = Readonly<{
${styleFields
  .map(
    (field) =>
      `  ${field.name}?: ${field.kind === 'number' ? 'number' : field.kind === 'boolean' ? 'boolean' : field.kind === 'color' ? 'ProcessedColorValue' : 'string'}`
  )
  .join('\n')}
  sdkModifiers?: string
}>

const colorFields = [${colorFields.map((field) => `'${field.name}'`).join(', ')}] as const
const sdkKinds = ${JSON.stringify(Object.fromEntries(derived.map((modifier) => [modifier.name, modifier.kind])))} as const

export function swiftStyleNative(style: OneNativeStyle | undefined): OneNativeStyleNative | undefined {
  if (!style) return undefined
  const native: Record<string, unknown> = {}
  const sdkModifiers: [string, string][] = []
  for (const [name, value] of Object.entries(style)) {
    if (value === undefined) continue
    if (Object.hasOwn(sdkKinds, name)) {
      const kind = sdkKinds[name as keyof typeof sdkKinds]
      if (kind === 'number' && (typeof value !== 'number' || !Number.isFinite(value))) throw new Error(name + ' must be finite')
      if (kind === 'optionalNumber' && value !== null && (typeof value !== 'number' || !Number.isFinite(value))) throw new Error(name + ' must be finite or null')
      if (kind === 'boolean' && typeof value !== 'boolean') throw new Error(name + ' must be a boolean')
      if (kind === 'optionalBoolean' && value !== null && typeof value !== 'boolean') throw new Error(name + ' must be a boolean or null')
      if (kind === 'string' && typeof value !== 'string') throw new Error(name + ' must be a string')
      if (kind === 'optionalEnum' && value !== null && typeof value !== 'string') throw new Error(name + ' must be a string or null')
      if (kind === 'optionalString' && value !== null && typeof value !== 'string') throw new Error(name + ' must be a string or null')
      if (kind === 'event' && typeof value !== 'function') throw new Error(name + ' must be a callback')
      if ((kind === 'bindingBoolean' || kind === 'bindingString') &&
        (typeof value !== 'object' || value === null || typeof (value as { onChange?: unknown }).onChange !== 'function' ||
        typeof (value as { value?: unknown }).value !== (kind === 'bindingBoolean' ? 'boolean' : 'string')))
        throw new Error(name + ' must be a binding')
      sdkModifiers.push([name, kind === 'event' ? '' : kind.startsWith('binding') ? String((value as { value: unknown }).value) : kind === 'optionalString' ? JSON.stringify(value) as string : String(value)])
    } else if (colorFields.includes(name as (typeof colorFields)[number])) {
      native[name] = processColor(value as ColorValue) ?? undefined
    } else {
      native[name] = value
    }
  }
  if (sdkModifiers.length) native.sdkModifiers = JSON.stringify(sdkModifiers)
  return native as OneNativeStyleNative
}

export function dispatchSDKEvent(style: OneNativeStyle | undefined, name: string, value: string): void {
  const modifier = (style as Record<string, unknown> | undefined)?.[name]
  const kind = sdkKinds[name as keyof typeof sdkKinds]
  if (kind === 'event') (modifier as (() => void) | undefined)?.()
  else if (kind === 'bindingBoolean') (modifier as { onChange: (value: boolean) => void } | undefined)?.onChange(value === 'true')
  else if (kind === 'bindingString') (modifier as { onChange: (value: string) => void } | undefined)?.onChange(value)
}
`
  )
  const properties = styleFields
    .map((field) => {
      switch (field.kind) {
        case 'number':
          return `  public var ${field.name}: CGFloat?`
        case 'string':
          return `  public var ${field.name}: String?`
        case 'boolean':
          return `  public var ${field.name}: Bool?`
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
        case 'boolean':
          return `    if let v = dictionary["${field.name}"] as? Bool { self.${field.name} = v }`
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
${frameworkImports.map((framework) => `import ${framework}`).join('\n')}

public struct OneNativeStyle: Equatable {
${properties}
  public var sdkModifiers: [[String]] = []

  public init() {}

  public init(dictionary: [String: Any]) {
${dictionaryParsers}
    if let json = dictionary["sdkModifiers"] as? String {
      guard let data = json.data(using: .utf8),
        let pairs = try? JSONDecoder().decode([[String]].self, from: data),
        pairs.allSatisfy({ $0.count == 2 }) else {
        preconditionFailure("invalid sdk modifiers")
      }
      sdkModifiers = pairs
    }
  }
}

extension View {
  public func oneNativeStyle(_ style: OneNativeStyle, emit: @escaping (String, String) -> Void = { _, _ in }) -> some View {
    var view = AnyView(self
      .oneNativeFont(style)
      .oneNativeForegroundStyle(style.foregroundStyle)
      .oneNativeTint(style.tint)
      .oneNativePadding(style)
      .oneNativeFrame(style)
      .oneNativeBackground(style.background)
      .oneNativeGlassEffect(style)
      .oneNativeCornerRadius(style.cornerRadius)
      .oneNativeOpacity(style.opacity)
      .oneNativeBorder(color: style.borderColor, width: style.borderWidth))
    for pair in style.sdkModifiers {
      let name = pair[0]
      let value = pair[1]
      switch name {
${generatedCalls}
      default: preconditionFailure("unknown sdk modifier: \\(name)")
      }
    }
    return view
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

extension View {
${generatedMethods}
}
`
  )
}
