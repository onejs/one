import type { Control } from './controlTypes'

// SwiftUI's colors:startPoint:endPoint: initializer, carried as sRGB hex colors
// and normalized UnitPoint coordinates over the One Native Fabric boundary.
export const gradientControls: Control[] = [
  {
    name: 'LinearGradient',
    layout: 'fill',
    decorativeWhenUnlabeled: true,
    fields: {
      colors: { type: 'strings', default: [], publicType: 'readonly string[]', required: true },
      startPoint: {
        type: 'string',
        default: '{"x":0.5,"y":0}',
        publicType: 'Readonly<{ x: number; y: number }>',
        jsDefault: '{ x: 0.5, y: 0 }',
        nativeValue: 'JSON.stringify(startPoint)',
      },
      endPoint: {
        type: 'string',
        default: '{"x":0.5,"y":1}',
        publicType: 'Readonly<{ x: number; y: number }>',
        jsDefault: '{ x: 0.5, y: 1 }',
        nativeValue: 'JSON.stringify(endPoint)',
      },
    },
    constructors: [
      {
        type: 'LinearGradient',
        parameters: [
          { label: 'colors', type: '[SwiftUICore.Color]' },
          { label: 'startPoint', type: 'SwiftUICore.UnitPoint' },
          { label: 'endPoint', type: 'SwiftUICore.UnitPoint' },
        ],
      },
    ],
    swift: `LinearGradient(
      colors: model.colors.compactMap(oneNativeLinearGradientColor),
      startPoint: oneNativeLinearGradientPoint(model.startPoint, fallback: .top),
      endPoint: oneNativeLinearGradientPoint(model.endPoint, fallback: .bottom)
    )`,
    extraSwift: `private struct OneNativeLinearGradientPoint: Decodable {
  let x: Double
  let y: Double
}

private func oneNativeLinearGradientPoint(_ raw: String, fallback: UnitPoint) -> UnitPoint {
  guard let data = raw.data(using: .utf8),
    let point = try? JSONDecoder().decode(OneNativeLinearGradientPoint.self, from: data),
    point.x.isFinite, point.y.isFinite else { return fallback }
  return UnitPoint(x: CGFloat(point.x), y: CGFloat(point.y))
}

private func oneNativeLinearGradientColor(_ value: String) -> Color? {
  guard value.first == "#", value.count == 7 || value.count == 9,
    let hex = UInt64(value.dropFirst(), radix: 16) else { return nil }
  let red, green, blue, alpha: UInt64
  if value.count == 7 {
    red = (hex >> 16) & 0xff
    green = (hex >> 8) & 0xff
    blue = hex & 0xff
    alpha = 0xff
  } else {
    red = (hex >> 24) & 0xff
    green = (hex >> 16) & 0xff
    blue = (hex >> 8) & 0xff
    alpha = hex & 0xff
  }
  return Color(.sRGB, red: Double(red) / 255, green: Double(green) / 255,
    blue: Double(blue) / 255, opacity: Double(alpha) / 255)
}`,
    setBody: {
      colors: `guard items.allSatisfy({ oneNativeLinearGradientColor($0) != nil }) else {
      NSLog("OneNative LinearGradient received invalid colors")
      return
    }
    if model.colors != items { model.colors = items }`,
    },
    validate: `  if (!Array.isArray(colors) ||
      !colors.every((color) => typeof color === 'string' && /^#[0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?$/.test(color)))
    throw new Error('LinearGradient colors must be an array of #RRGGBB or #RRGGBBAA colors')
  for (const point of [startPoint, endPoint])
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y))
      throw new Error('LinearGradient points must have finite x and y coordinates')`,
  },
]
