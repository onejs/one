import type { Control, ControlField } from './controlTypes'

const style = (name: string, type: string, fields: readonly string[]): ControlField => ({
  type: 'string',
  default: '{}',
  publicType: type,
  jsDefault: 'undefined',
  nativeValue: `chartStyleNative('${name}', ${name}, ${JSON.stringify(fields)})`,
})

// Swift Charts behind Expo UI's Chart props, so a chart written for
// @expo/ui/swift-ui renders unchanged: one mark per data point of the chosen
// type, rule marks for the reference lines, and per-type style objects. data
// and styles reach Swift as JSON; chartNative validates and encodes them.
export const chartControls: Control[] = [
  {
    name: 'Chart',
    layout: 'fill',
    imports: ['Charts'],
    adapterImports: ["import { chartPointsNative, chartStyleNative } from '../chartNative'"],
    typeImports: [
      "import type { AreaChartStyle, BarChartStyle, ChartDataPoint, ChartType, LineChartStyle, PieChartStyle, PointChartStyle, RectangleChartStyle, RuleChartStyle } from '../chartTypes'",
    ],
    fields: {
      data: {
        type: 'string',
        default: '[]',
        publicType: 'readonly ChartDataPoint[]',
        required: true,
        nativeValue: "chartPointsNative('data', data)",
      },
      type: { type: 'string', default: 'line', publicType: 'ChartType' },
      showGrid: { type: 'boolean', default: true },
      animate: { type: 'boolean', default: true },
      showLegend: { type: 'boolean', default: false },
      referenceLines: {
        type: 'string',
        default: '[]',
        publicType: 'readonly ChartDataPoint[]',
        jsDefault: '[]',
        nativeValue: "chartPointsNative('referenceLines', referenceLines)",
      },
      lineStyle: style('lineStyle', 'LineChartStyle', ['dashArray', 'width', 'pointStyle', 'pointSize', 'color']),
      pointStyle: style('pointStyle', 'PointChartStyle', ['pointStyle', 'pointSize']),
      areaStyle: style('areaStyle', 'AreaChartStyle', ['color']),
      barStyle: style('barStyle', 'BarChartStyle', ['cornerRadius', 'width']),
      pieStyle: style('pieStyle', 'PieChartStyle', ['innerRadius', 'angularInset']),
      rectangleStyle: style('rectangleStyle', 'RectangleChartStyle', ['color', 'cornerRadius']),
      ruleStyle: style('ruleStyle', 'RuleChartStyle', ['color', 'lineWidth', 'dashArray']),
    },
    constructors: [
      { type: 'Chart', parameters: [{ label: 'content', type: '() -> Content' }] },
    ],
    swift: 'OneNativeChartSurface(model: model)',
    extraSwift: `private struct OneNativeChartPoint: Decodable {
  enum X { case label(String), number(Double) }
  let x: X
  let y: Double
  let color: Color?
  private enum CodingKeys: String, CodingKey { case x, y, color }
  init(from decoder: Decoder) throws {
    let container = try decoder.container(keyedBy: CodingKeys.self)
    if let number = try? container.decode(Double.self, forKey: .x) {
      x = .number(number)
    } else {
      x = .label(try container.decode(String.self, forKey: .x))
    }
    y = try container.decode(Double.self, forKey: .y)
    color = try container.decodeIfPresent(UInt32.self, forKey: .color).map(oneNativeChartColor)
  }
  var label: String {
    switch x {
    case .label(let label): return label
    case .number(let number): return String(number)
    }
  }
}

// every chart style type in one shape; chartNative admits only each type's own keys.
private struct OneNativeChartStyle: Decodable {
  var dashArray: [Double]?
  var width: Double?
  var pointStyle: String?
  var pointSize: Double?
  var color: UInt32?
  var cornerRadius: Double?
  var innerRadius: Double?
  var angularInset: Double?
  var lineWidth: Double?
}

// React Native's processed color: 0xAARRGGBB.
private func oneNativeChartColor(_ argb: UInt32) -> Color {
  Color(.sRGB,
    red: Double((argb >> 16) & 0xff) / 255,
    green: Double((argb >> 8) & 0xff) / 255,
    blue: Double(argb & 0xff) / 255,
    opacity: Double((argb >> 24) & 0xff) / 255)
}

private func oneNativeChartDecode<T: Decodable>(_ json: String, _ name: String) -> T {
  guard let data = json.data(using: .utf8), let value = try? JSONDecoder().decode(T.self, from: data) else {
    preconditionFailure("invalid Chart \\(name)")
  }
  return value
}

private enum OneNativeChartKind: String { case line, point, bar, area, pie, rectangle }

private func oneNativeChartKind(_ value: String) -> OneNativeChartKind {
  guard let kind = OneNativeChartKind(rawValue: value) else { preconditionFailure("invalid Chart type: \\(value)") }
  return kind
}

private func oneNativeChartSymbol(_ style: String?) -> BasicChartSymbolShape {
  switch style ?? "circle" {
  case "circle": return .circle
  case "square": return .square
  case "diamond": return .diamond
  default: preconditionFailure("invalid Chart pointStyle: \\(style ?? "")")
  }
}

private struct OneNativeChartSurface: View {
  @ObservedObject var model: ChartModel

  var body: some View {
    let points: [OneNativeChartPoint] = oneNativeChartDecode(model.data, "data")
    let rules: [OneNativeChartPoint] = oneNativeChartDecode(model.referenceLines, "referenceLines")
    let line: OneNativeChartStyle = oneNativeChartDecode(model.lineStyle, "lineStyle")
    let point: OneNativeChartStyle = oneNativeChartDecode(model.pointStyle, "pointStyle")
    let area: OneNativeChartStyle = oneNativeChartDecode(model.areaStyle, "areaStyle")
    let bar: OneNativeChartStyle = oneNativeChartDecode(model.barStyle, "barStyle")
    let pie: OneNativeChartStyle = oneNativeChartDecode(model.pieStyle, "pieStyle")
    let rectangle: OneNativeChartStyle = oneNativeChartDecode(model.rectangleStyle, "rectangleStyle")
    let rule: OneNativeChartStyle = oneNativeChartDecode(model.ruleStyle, "ruleStyle")
    // categorical colors and the legend apply only when no point names its own color.
    let individualColors = points.contains { $0.color != nil }
    let kind = oneNativeChartKind(model.type)
    Chart {
      ForEach(Array(points.enumerated()), id: \\.offset) { _, item in
        switch kind {
        case .line:
          switch item.x {
          case .label(let x): lineMark(x, item, line)
          case .number(let x): lineMark(x, item, line)
          }
        case .point:
          switch item.x {
          case .label(let x): pointMark(x, item, point)
          case .number(let x): pointMark(x, item, point)
          }
        case .bar:
          switch item.x {
          case .label(let x): barMark(x, item, bar, individualColors)
          case .number(let x): barMark(x, item, bar, individualColors)
          }
        case .area:
          switch item.x {
          case .label(let x): AreaMark(x: .value("X", x), y: .value("Y", item.y)).foregroundStyle(area.color.map(oneNativeChartColor) ?? .blue)
          case .number(let x): AreaMark(x: .value("X", x), y: .value("Y", item.y)).foregroundStyle(area.color.map(oneNativeChartColor) ?? .blue)
          }
        case .pie:
          let sector = SectorMark(angle: .value("Value", item.y), innerRadius: .ratio(pie.innerRadius ?? 0.3), angularInset: pie.angularInset ?? 2)
          if individualColors {
            sector.foregroundStyle(item.color ?? .blue).opacity(0.8)
          } else {
            sector.foregroundStyle(by: .value("Category", item.label)).opacity(0.8)
          }
        case .rectangle:
          switch item.x {
          case .label(let x): rectangleMark(x, item, rectangle)
          case .number(let x): rectangleMark(x, item, rectangle)
          }
        }
      }
      ForEach(Array(rules.enumerated()), id: \\.offset) { _, item in
        RuleMark(y: .value("Reference", item.y))
          .foregroundStyle(item.color ?? rule.color.map(oneNativeChartColor) ?? .red)
          .lineStyle(StrokeStyle(lineWidth: rule.lineWidth ?? 2, dash: (rule.dashArray ?? []).map { CGFloat($0) }))
      }
    }
    .chartXAxis(model.showGrid ? .visible : .hidden)
    .chartYAxis(model.showGrid ? .visible : .hidden)
    .animation(model.animate ? .easeInOut : nil, value: points.count)
    .chartLegend(position: .automatic, spacing: 16)
    .chartLegend(model.showLegend ? .visible : .hidden)
  }

  private func lineMark<X: Plottable>(_ x: X, _ item: OneNativeChartPoint, _ style: OneNativeChartStyle) -> some Charts.ChartContent {
    LineMark(x: .value("X", x), y: .value("Y", item.y))
      .foregroundStyle(style.color.map(oneNativeChartColor) ?? .blue)
      .symbol(oneNativeChartSymbol(style.pointStyle))
      .symbolSize(CGFloat(style.pointSize ?? 6))
      .lineStyle(StrokeStyle(lineWidth: style.width ?? 2, dash: (style.dashArray ?? []).map { CGFloat($0) }))
  }

  private func pointMark<X: Plottable>(_ x: X, _ item: OneNativeChartPoint, _ style: OneNativeChartStyle) -> some Charts.ChartContent {
    PointMark(x: .value("X", x), y: .value("Y", item.y))
      .foregroundStyle(item.color ?? .blue)
      .symbol(oneNativeChartSymbol(style.pointStyle))
      .symbolSize(CGFloat(style.pointSize ?? 6))
  }

  @ChartContentBuilder
  private func barMark<X: Plottable>(_ x: X, _ item: OneNativeChartPoint, _ style: OneNativeChartStyle, _ individualColors: Bool) -> some Charts.ChartContent {
    let mark = style.width.map { BarMark(x: .value("X", x), y: .value("Y", item.y), width: .fixed(CGFloat($0))) }
      ?? BarMark(x: .value("X", x), y: .value("Y", item.y))
    if individualColors {
      mark.foregroundStyle(item.color ?? .blue).cornerRadius(CGFloat(style.cornerRadius ?? 0))
    } else {
      mark.foregroundStyle(by: .value("Category", item.label)).cornerRadius(CGFloat(style.cornerRadius ?? 0))
    }
  }

  private func rectangleMark<X: Plottable>(_ x: X, _ item: OneNativeChartPoint, _ style: OneNativeChartStyle) -> some Charts.ChartContent {
    RectangleMark(x: .value("X", x), y: .value("Y", item.y))
      .foregroundStyle(item.color ?? style.color.map(oneNativeChartColor) ?? .blue)
      .cornerRadius(CGFloat(style.cornerRadius ?? 0))
  }
}`,
    validate: `  const chartTypes = ['line', 'point', 'bar', 'area', 'pie', 'rectangle']
  if (!chartTypes.includes(type)) throw new Error('Swift.Chart type must be one of ' + chartTypes.join(', '))
  for (const [key, flag] of [['showGrid', showGrid], ['animate', animate], ['showLegend', showLegend]] as const)
    if (typeof flag !== 'boolean') throw new Error('Swift.Chart ' + key + ' must be a boolean')`,
  },
]
