import SwiftUI

// the grids share SwiftUI's alignment and GridItem values. the TypeScript side validates
// and normalizes every value first, so an unknown one here is a bridge bug, not input.
enum OneNativeGridValues {
  static func alignment(_ raw: String, _ owner: String) -> Alignment {
    switch raw {
    case "topLeading": return .topLeading
    case "top": return .top
    case "topTrailing": return .topTrailing
    case "leading": return .leading
    case "center": return .center
    case "trailing": return .trailing
    case "bottomLeading": return .bottomLeading
    case "bottom": return .bottom
    case "bottomTrailing": return .bottomTrailing
    default: preconditionFailure("invalid \(owner) alignment: \(raw)")
    }
  }

  static func horizontal(_ raw: String, _ owner: String) -> HorizontalAlignment {
    switch raw {
    case "leading": return .leading
    case "center": return .center
    case "trailing": return .trailing
    default: preconditionFailure("invalid \(owner) alignment: \(raw)")
    }
  }

  static func vertical(_ raw: String, _ owner: String) -> VerticalAlignment {
    switch raw {
    case "top": return .top
    case "center": return .center
    case "bottom": return .bottom
    case "firstTextBaseline": return .firstTextBaseline
    case "lastTextBaseline": return .lastTextBaseline
    default: preconditionFailure("invalid \(owner) alignment: \(raw)")
    }
  }

  // A string carries an optional CGFloat across Fabric without reserving any
  // numeric value: SwiftUI allows negative spacing for overlapping cells.
  static func optional(_ raw: String, _ owner: String) -> CGFloat? {
    if raw == "null" { return nil }
    guard let value = Double(raw), value.isFinite else {
      preconditionFailure("invalid \(owner) spacing: \(raw)")
    }
    return CGFloat(value)
  }

  private struct Item: Decodable {
    let size: String
    let value: Double
    let minimum: Double
    let maximum: Double
    let spacing: Double?
    let alignment: String
  }

  // `[{"size":"fixed","value":80,...}]`, one entry per column or row, as the adapter
  // writes it: -1 for absent size bounds, null for omitted spacing, and "" for no alignment.
  static func items(_ json: String, _ owner: String) -> [GridItem] {
    guard let data = json.data(using: .utf8),
      let items = try? JSONDecoder().decode([Item].self, from: data)
    else { preconditionFailure("invalid \(owner) grid items: \(json)") }
    return items.map { item in
      let size: GridItem.Size
      switch item.size {
      case "fixed": size = .fixed(item.value)
      case "flexible":
        size = .flexible(
          minimum: item.minimum >= 0 ? item.minimum : 10,
          maximum: item.maximum >= 0 ? item.maximum : .infinity)
      case "adaptive":
        size = .adaptive(
          minimum: item.minimum, maximum: item.maximum >= 0 ? item.maximum : .infinity)
      default: preconditionFailure("invalid \(owner) grid item size: \(item.size)")
      }
      return GridItem(
        size, spacing: item.spacing.map { CGFloat($0) },
        alignment: item.alignment.isEmpty ? nil : alignment(item.alignment, owner))
    }
  }
}
