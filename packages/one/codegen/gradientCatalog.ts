import type { Control } from './controlTypes'

// SwiftUI gradient initializers, carried as sRGB hex colors and normalized
// UnitPoint coordinates over the One Native Fabric boundary.
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
  {
    name: 'RadialGradient',
    layout: 'fill',
    decorativeWhenUnlabeled: true,
    fields: {
      colors: { type: 'strings', default: [], publicType: 'readonly string[]', required: true },
      center: {
        type: 'string',
        default: '{"x":0.5,"y":0.5}',
        publicType: 'Readonly<{ x: number; y: number }>',
        jsDefault: '{ x: 0.5, y: 0.5 }',
        nativeValue: 'JSON.stringify(center)',
      },
      startRadius: { type: 'Double', default: 0 },
      endRadius: { type: 'Double', default: 0, required: true },
    },
    constructors: [
      {
        type: 'RadialGradient',
        parameters: [
          { label: 'colors', type: '[SwiftUICore.Color]' },
          { label: 'center', type: 'SwiftUICore.UnitPoint' },
          { label: 'startRadius', type: 'CoreFoundation.CGFloat' },
          { label: 'endRadius', type: 'CoreFoundation.CGFloat' },
        ],
      },
    ],
    swift: `RadialGradient(
      colors: model.colors.compactMap(oneNativeRadialGradientColor),
      center: oneNativeRadialGradientPoint(model.center),
      startRadius: model.startRadius,
      endRadius: model.endRadius
    )`,
    extraSwift: `private struct OneNativeRadialGradientPoint: Decodable {
  let x: Double
  let y: Double
}

private func oneNativeRadialGradientPoint(_ raw: String) -> UnitPoint {
  guard let data = raw.data(using: .utf8),
    let point = try? JSONDecoder().decode(OneNativeRadialGradientPoint.self, from: data),
    point.x.isFinite, point.y.isFinite else { return .center }
  return UnitPoint(x: CGFloat(point.x), y: CGFloat(point.y))
}

private func oneNativeRadialGradientColor(_ value: String) -> Color? {
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
      colors: `guard items.allSatisfy({ oneNativeRadialGradientColor($0) != nil }) else {
      NSLog("OneNative RadialGradient received invalid colors")
      return
    }
    if model.colors != items { model.colors = items }`,
    },
    validate: `  if (!Array.isArray(colors) ||
      !colors.every((color) => typeof color === 'string' && /^#[0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?$/.test(color)))
    throw new Error('RadialGradient colors must be an array of #RRGGBB or #RRGGBBAA colors')
  if (!center || !Number.isFinite(center.x) || !Number.isFinite(center.y))
    throw new Error('RadialGradient center must have finite x and y coordinates')
  if (!Number.isFinite(startRadius) || !Number.isFinite(endRadius))
    throw new Error('RadialGradient radii must be finite numbers')`,
  },
  {
    name: 'EllipticalGradient',
    layout: 'fill',
    decorativeWhenUnlabeled: true,
    fields: {
      colors: { type: 'strings', default: [], publicType: 'readonly string[]', required: true },
      center: {
        type: 'string',
        default: '{"x":0.5,"y":0.5}',
        publicType: 'Readonly<{ x: number; y: number }>',
        jsDefault: '{ x: 0.5, y: 0.5 }',
        nativeValue: 'JSON.stringify(center)',
      },
      startRadiusFraction: { type: 'Double', default: 0 },
      endRadiusFraction: { type: 'Double', default: 0.5 },
    },
    constructors: [
      {
        type: 'EllipticalGradient',
        parameters: [
          { label: 'colors', type: '[SwiftUICore.Color]' },
          { label: 'center', type: 'SwiftUICore.UnitPoint' },
          { label: 'startRadiusFraction', type: 'CoreFoundation.CGFloat' },
          { label: 'endRadiusFraction', type: 'CoreFoundation.CGFloat' },
        ],
      },
    ],
    swift: `EllipticalGradient(
      colors: model.colors.compactMap(oneNativeEllipticalGradientColor),
      center: oneNativeEllipticalGradientPoint(model.center),
      startRadiusFraction: model.startRadiusFraction,
      endRadiusFraction: model.endRadiusFraction
    )`,
    extraSwift: `private struct OneNativeEllipticalGradientPoint: Decodable {
  let x: Double
  let y: Double
}

private func oneNativeEllipticalGradientPoint(_ raw: String) -> UnitPoint {
  guard let data = raw.data(using: .utf8),
    let point = try? JSONDecoder().decode(OneNativeEllipticalGradientPoint.self, from: data),
    point.x.isFinite, point.y.isFinite else { return .center }
  return UnitPoint(x: CGFloat(point.x), y: CGFloat(point.y))
}

private func oneNativeEllipticalGradientColor(_ value: String) -> Color? {
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
      colors: `guard items.allSatisfy({ oneNativeEllipticalGradientColor($0) != nil }) else {
      NSLog("OneNative EllipticalGradient received invalid colors")
      return
    }
    if model.colors != items { model.colors = items }`,
    },
    validate: `  if (!Array.isArray(colors) ||
      !colors.every((color) => typeof color === 'string' && /^#[0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?$/.test(color)))
    throw new Error('EllipticalGradient colors must be an array of #RRGGBB or #RRGGBBAA colors')
  if (!center || !Number.isFinite(center.x) || !Number.isFinite(center.y))
    throw new Error('EllipticalGradient center must have finite x and y coordinates')
  if (!Number.isFinite(startRadiusFraction) || !Number.isFinite(endRadiusFraction))
    throw new Error('EllipticalGradient radius fractions must be finite numbers')`,
  },
  {
    name: 'AngularGradient',
    layout: 'fill',
    decorativeWhenUnlabeled: true,
    fields: {
      colors: { type: 'strings', default: [], publicType: 'readonly string[]', required: true },
      center: {
        type: 'string',
        default: '{"x":0.5,"y":0.5}',
        publicType: 'Readonly<{ x: number; y: number }>',
        jsDefault: '{ x: 0.5, y: 0.5 }',
        nativeValue: 'JSON.stringify(center)',
      },
      angle: {
        type: 'string',
        default: '{"radians":0}',
        publicType: 'Readonly<{ radians: number }>',
        jsDefault: '{ radians: 0 }',
        nativeValue: 'JSON.stringify(angle)',
      },
    },
    constructors: [
      {
        type: 'AngularGradient',
        parameters: [
          { label: 'colors', type: '[SwiftUICore.Color]' },
          { label: 'center', type: 'SwiftUICore.UnitPoint' },
          { label: 'angle', type: 'SwiftUICore.Angle' },
        ],
      },
    ],
    swift: `AngularGradient(
      colors: model.colors.compactMap(oneNativeAngularGradientColor),
      center: oneNativeAngularGradientPoint(model.center),
      angle: oneNativeAngularGradientAngle(model.angle)
    )`,
    extraSwift: `private struct OneNativeAngularGradientPoint: Decodable {
  let x: Double
  let y: Double
}

private struct OneNativeAngularGradientRadians: Decodable {
  let radians: Double
}

private func oneNativeAngularGradientPoint(_ raw: String) -> UnitPoint {
  guard let data = raw.data(using: .utf8),
    let point = try? JSONDecoder().decode(OneNativeAngularGradientPoint.self, from: data),
    point.x.isFinite, point.y.isFinite else { return .center }
  return UnitPoint(x: CGFloat(point.x), y: CGFloat(point.y))
}

private func oneNativeAngularGradientAngle(_ raw: String) -> Angle {
  guard let data = raw.data(using: .utf8),
    let value = try? JSONDecoder().decode(OneNativeAngularGradientRadians.self, from: data),
    value.radians.isFinite else { return .zero }
  return Angle(radians: value.radians)
}

private func oneNativeAngularGradientColor(_ value: String) -> Color? {
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
      colors: `guard items.allSatisfy({ oneNativeAngularGradientColor($0) != nil }) else {
      NSLog("OneNative AngularGradient received invalid colors")
      return
    }
    if model.colors != items { model.colors = items }`,
    },
    validate: `  if (!Array.isArray(colors) ||
      !colors.every((color) => typeof color === 'string' && /^#[0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?$/.test(color)))
    throw new Error('AngularGradient colors must be an array of #RRGGBB or #RRGGBBAA colors')
  if (!center || !Number.isFinite(center.x) || !Number.isFinite(center.y))
    throw new Error('AngularGradient center must have finite x and y coordinates')
  if (!angle || !Number.isFinite(angle.radians))
    throw new Error('AngularGradient angle must have finite radians')`,
  },
  {
    name: 'MeshGradient',
    layout: 'fill',
    decorativeWhenUnlabeled: true,
    fields: {
      meshWidth: { type: 'Double', default: 2, required: true },
      meshHeight: { type: 'Double', default: 2, required: true },
      points: {
        type: 'string',
        default: '[{"x":0,"y":0},{"x":1,"y":0},{"x":0,"y":1},{"x":1,"y":1}]',
        publicType: 'readonly Readonly<{ x: number; y: number }>[]',
        required: true,
        nativeValue: 'JSON.stringify(points)',
      },
      colors: {
        type: 'strings',
        default: ['#000000', '#000000', '#000000', '#000000'],
        publicType: 'readonly string[]',
        required: true,
      },
      background: { type: 'string', default: '#00000000' },
      smoothsColors: { type: 'boolean', default: true },
      colorSpace: {
        type: 'string',
        default: 'device',
        publicType: "'device' | 'perceptual'",
      },
    },
    constructors: [
      {
        type: 'MeshGradient',
        parameters: [
          { label: 'width', type: 'Swift.Int' },
          { label: 'height', type: 'Swift.Int' },
          { label: 'points', type: '[Swift.SIMD2<Swift.Float>]' },
          { label: 'colors', type: '[SwiftUICore.Color]' },
          { label: 'background', type: 'SwiftUICore.Color' },
          { label: 'smoothsColors', type: 'Swift.Bool' },
          { label: 'colorSpace', type: 'SwiftUICore.Gradient.ColorSpace' },
        ],
      },
    ],
    swift: `Group {
      if #available(iOS 18.0, *),
        let meshWidth = Int(exactly: model.meshWidth), meshWidth >= 2,
        let meshHeight = Int(exactly: model.meshHeight), meshHeight >= 2,
        let points = oneNativeMeshGradientPoints(model.points),
        points.count == model.colors.count,
        meshWidth <= points.count,
        points.count % meshWidth == 0,
        points.count / meshWidth == meshHeight,
        let background = oneNativeMeshGradientColor(model.background) {
        MeshGradient(
          width: meshWidth,
          height: meshHeight,
          points: points,
          colors: model.colors.compactMap(oneNativeMeshGradientColor),
          background: background,
          smoothsColors: model.smoothsColors,
          colorSpace: model.colorSpace == "perceptual" ? .perceptual : .device
        )
      } else {
        Color.clear
      }
    }`,
    extraSwift: `private struct OneNativeMeshGradientPoint: Decodable {
  let x: Float
  let y: Float
}

private func oneNativeMeshGradientPoints(_ raw: String) -> [SIMD2<Float>]? {
  guard let data = raw.data(using: .utf8),
    let points = try? JSONDecoder().decode([OneNativeMeshGradientPoint].self, from: data),
    points.allSatisfy({ $0.x.isFinite && $0.y.isFinite }) else { return nil }
  return points.map { SIMD2<Float>($0.x, $0.y) }
}

private func oneNativeMeshGradientColor(_ value: String) -> Color? {
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
      colors: `guard items.allSatisfy({ oneNativeMeshGradientColor($0) != nil }) else {
      NSLog("OneNative MeshGradient received invalid colors")
      return
    }
    if model.colors != items { model.colors = items }`,
    },
    validate: `  if (Number.parseFloat(String(Platform.Version)) < 18)
    throw new Error('MeshGradient requires iOS 18 or newer')
  if (!Number.isSafeInteger(meshWidth) || meshWidth < 2 ||
    !Number.isSafeInteger(meshHeight) || meshHeight < 2)
    throw new Error('MeshGradient meshWidth and meshHeight must be integers of at least 2')
  if (!Array.isArray(points) || points.length !== meshWidth * meshHeight ||
    !points.every((point) => point && Number.isFinite(point.x) && Number.isFinite(point.y) &&
      Number.isFinite(Math.fround(point.x)) && Number.isFinite(Math.fround(point.y))))
    throw new Error('MeshGradient points must contain meshWidth × meshHeight finite Float32 coordinates')
  if (!Array.isArray(colors) || colors.length !== meshWidth * meshHeight ||
    !colors.every((color) => typeof color === 'string' && /^#[0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?$/.test(color)))
    throw new Error('MeshGradient colors must contain meshWidth × meshHeight #RRGGBB or #RRGGBBAA colors')
  if (typeof background !== 'string' || !/^#[0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?$/.test(background))
    throw new Error('MeshGradient background must be #RRGGBB or #RRGGBBAA')
  if (colorSpace !== 'device' && colorSpace !== 'perceptual')
    throw new Error('MeshGradient colorSpace must be device or perceptual')`,
  },
]
