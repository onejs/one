import { commonFields, type Control } from './controlTypes'

export const pickerControls: Control[] = [
  {
    name: 'Picker',
    value: { type: 'string', prop: 'selection', event: 'onSelectionChange', initial: '' },
    fields: {
      ...commonFields,
      options: {
        type: 'objects',
        default: '',
        payload: { name: 'PickerOption', element: { value: 'string', label: 'string' } },
      },
    },
    constructors: [
      {
        type: 'Picker',
        parameters: [
          { label: 'selection', type: 'SwiftUICore.Binding<SelectionValue>' },
          { label: 'content', type: '() -> Content' },
          { label: 'label', type: '() -> Label' },
        ],
      },
    ],
    swift: `Picker(selection: Binding(
        get: { model.controlled.value },
        set: { value in model.change(value) }
      )) {
        ForEach(model.options, id: \\.value) { option in
          Text(option.label).tag(option.value)
        }
      } label: {
        Text(model.label)
      }`,
    validate: `  if (!Array.isArray(options) || options.some(option => typeof option?.value !== 'string' || typeof option?.label !== 'string')) throw new Error('Picker options must contain string value and label fields')
  if (!options.length) throw new Error('Picker options must not be empty')
  if (new Set(options.map(option => option.value)).size !== options.length) throw new Error('Picker option values must be unique')
  if (!options.some(option => option.value === selection)) throw new Error('Picker selection must match an option value')`,
  },
  {
    name: 'DatePicker',
    value: {
      type: 'Double',
      prop: 'selection',
      event: 'onSelectionChange',
      initial: 0,
      publicType: 'Date',
      nativeValue: 'selection.getTime()',
      eventValue: 'new Date(event.value)',
    },
    fields: {
      ...commonFields,
      // SwiftUI's closed range arrives as one tuple; the scalars stay native-only.
      // type/default only satisfy the field shape; publicType/jsDefault carry the surface.
      in: {
        type: 'Double',
        default: 0,
        noNative: true,
        as: 'range',
        publicType: 'readonly [Date, Date]',
        jsDefault: '[new Date(-62135769600000), new Date(64092211200000)]',
      },
      minimumDate: { type: 'Double', default: -62135769600000, derived: true, nativeValue: 'range[0].getTime()' },
      maximumDate: { type: 'Double', default: 64092211200000, derived: true, nativeValue: 'range[1].getTime()' },
      displayedComponents: {
        type: 'string',
        default: 'dateAndTime',
        publicType: "'date' | 'hourAndMinute' | 'dateAndTime'",
      },
    },
    constructors: [
      {
        type: 'DatePicker',
        parameters: [
          { label: 'selection', type: 'SwiftUICore.Binding<Foundation.Date>' },
          { label: 'in', type: 'Swift.ClosedRange<Foundation.Date>' },
          {
            label: 'displayedComponents',
            type: 'SwiftUI.DatePicker<Label>.Components',
          },
          { label: 'label', type: '() -> Label' },
        ],
      },
    ],
    swift: `DatePicker(selection: Binding(
        get: { Date(timeIntervalSince1970: model.controlled.value / 1000) },
        set: { value in model.change(value.timeIntervalSince1970 * 1000) }
      ), in: Date(timeIntervalSince1970: model.minimumDate / 1000)...Date(timeIntervalSince1970: model.maximumDate / 1000), displayedComponents: oneNativeDatePickerComponents(model.displayedComponents)) {
        Text(model.label)
      }`,
    extraSwift: `private func oneNativeDatePickerComponents(_ value: String) -> DatePicker<Text>.Components {
  switch value {
  case "date": return .date
  case "hourAndMinute": return .hourAndMinute
  case "dateAndTime": return [.date, .hourAndMinute]
  default: preconditionFailure("unsupported DatePicker displayedComponents: \\(value)")
  }
}`,
    validate: `  const selectionTime = selection instanceof Date ? selection.getTime() : NaN
  const minimumTime = range[0] instanceof Date ? range[0].getTime() : NaN
  const maximumTime = range[1] instanceof Date ? range[1].getTime() : NaN
  if (![selectionTime, minimumTime, maximumTime].every(Number.isFinite)) throw new Error('DatePicker selection and in bounds must be valid Date values')
  if (minimumTime > maximumTime) throw new Error('DatePicker in lower bound must not be after the upper bound')
  if (selectionTime < minimumTime || selectionTime > maximumTime) throw new Error('DatePicker selection must be within its in bounds')
  if (!['date', 'hourAndMinute', 'dateAndTime'].includes(displayedComponents)) throw new Error('DatePicker displayedComponents must be date, hourAndMinute, or dateAndTime')`,
  },
  {
    name: 'ColorPicker',
    value: {
      type: 'string',
      prop: 'selection',
      event: 'onSelectionChange',
      initial: '#000000',
    },
    fields: {
      ...commonFields,
      supportsOpacity: { type: 'boolean', default: true },
    },
    constructors: [
      {
        type: 'ColorPicker',
        parameters: [
          { label: '_', type: 'SwiftUICore.LocalizedStringKey' },
          { label: 'selection', type: 'SwiftUICore.Binding<SwiftUICore.Color>' },
          { label: 'supportsOpacity', type: 'Swift.Bool' },
        ],
      },
    ],
    swift: `ColorPicker(LocalizedStringKey(model.label), selection: Binding(
        get: { oneNativeDecodeColor(model.controlled.value) },
        set: { value in model.change(oneNativeEncodeColor(value, supportsOpacity: model.supportsOpacity)) }
      ), supportsOpacity: model.supportsOpacity)`,
    extraSwift: `private func oneNativeDecodeColor(_ value: String) -> Color {
  let hex = String(value.dropFirst())
  let number = UInt64(hex, radix: 16)!
  let hasAlpha = hex.count == 8
  return Color(
    red: Double((number >> (hasAlpha ? 24 : 16)) & 0xff) / 255,
    green: Double((number >> (hasAlpha ? 16 : 8)) & 0xff) / 255,
    blue: Double((number >> (hasAlpha ? 8 : 0)) & 0xff) / 255,
    opacity: hasAlpha ? Double(number & 0xff) / 255 : 1
  )
}

private func oneNativeEncodeColor(_ color: Color, supportsOpacity: Bool) -> String {
  var red: CGFloat = 0
  var green: CGFloat = 0
  var blue: CGFloat = 0
  var alpha: CGFloat = 0
  precondition(UIColor(color).getRed(&red, green: &green, blue: &blue, alpha: &alpha), "ColorPicker produced a non-RGB color")
  let channels = [red, green, blue] + (supportsOpacity ? [alpha] : [])
  return "#" + channels.map { String(format: "%02X", Int(($0 * 255).rounded())) }.joined()
}`,
    validate: `  if (typeof selection !== 'string' || !/^#[0-9A-Fa-f]{6}(?:[0-9A-Fa-f]{2})?$/.test(selection)) throw new Error('ColorPicker selection must be #RRGGBB or #RRGGBBAA')`,
  },
  {
    // a set of DateComponents travels as a sorted JSON array of epoch milliseconds:
    // the controlled protocol only carries scalars, and the adapter sorts so the
    // native echo matches byte for byte. days follow the device calendar, so a
    // selection is day-precision and same-day duplicates collapse into one date.
    name: 'MultiDatePicker',
    value: {
      type: 'string',
      prop: 'selection',
      event: 'onSelectionChange',
      initial: '[]',
      publicType: 'readonly Date[]',
      nativeValue: 'JSON.stringify(selection.map(date => date.getTime()).sort((a, b) => a - b))',
      eventValue: 'JSON.parse(event.value).map((time: number) => new Date(time))',
    },
    fields: {
      ...commonFields,
      // SwiftUI's closed range arrives as one tuple; the scalars stay native-only.
      // type/default only satisfy the field shape; publicType/jsDefault carry the surface.
      in: {
        type: 'Double',
        default: 0,
        noNative: true,
        as: 'range',
        publicType: 'readonly [Date, Date]',
        jsDefault: '[new Date(-62135769600000), new Date(64092211200000)]',
      },
      minimumDate: { type: 'Double', default: -62135769600000, derived: true, nativeValue: 'range[0].getTime()' },
      maximumDate: { type: 'Double', default: 64092211200000, derived: true, nativeValue: 'range[1].getTime()' },
    },
    constructors: [
      {
        type: 'MultiDatePicker',
        parameters: [
          { label: '_', type: 'SwiftUICore.LocalizedStringKey' },
          { label: 'selection', type: 'SwiftUICore.Binding<Swift.Set<Foundation.DateComponents>>' },
          { label: 'in', type: 'Swift.Range<Foundation.Date>' },
        ],
      },
    ],
    swift: `MultiDatePicker(LocalizedStringKey(model.label), selection: Binding(
        get: { oneNativeDecodeDates(model.controlled.value) },
        set: { value in model.change(oneNativeEncodeDates(value)) }
      ), in: Date(timeIntervalSince1970: model.minimumDate / 1000)..<Date(timeIntervalSince1970: model.maximumDate / 1000))`,
    extraSwift: `private func oneNativeDecodeDates(_ json: String) -> Set<DateComponents> {
  guard let data = json.data(using: .utf8),
    let times = try? JSONDecoder().decode([Double].self, from: data)
  else { preconditionFailure("MultiDatePicker selection is not a JSON array of epoch milliseconds") }
  let calendar = Calendar.current
  return Set(times.map { calendar.dateComponents([.calendar, .era, .year, .month, .day], from: Date(timeIntervalSince1970: $0 / 1000)) })
}

private func oneNativeEncodeDates(_ value: Set<DateComponents>) -> String {
  let calendar = Calendar.current
  let times = value.compactMap { components -> Double? in
    guard let date = calendar.date(from: components) else { return nil }
    return date.timeIntervalSince1970 * 1000
  }
  let data = try! JSONEncoder().encode(times.sorted())
  return String(data: data, encoding: .utf8)!
}`,
    validate: `  if (!Array.isArray(selection) || selection.some(date => !(date instanceof Date) || Number.isNaN(date.getTime()))) throw new Error('MultiDatePicker selection must be an array of valid Dates')
  const minimumTime = range[0] instanceof Date ? range[0].getTime() : NaN
  const maximumTime = range[1] instanceof Date ? range[1].getTime() : NaN
  if (![minimumTime, maximumTime].every(Number.isFinite)) throw new Error('MultiDatePicker in bounds must be valid Date values')
  if (minimumTime > maximumTime) throw new Error('MultiDatePicker in lower bound must not be after the upper bound')
  if (selection.some(date => date.getTime() < minimumTime || date.getTime() > maximumTime)) throw new Error('MultiDatePicker selection must be within its in bounds')`,
  },
]
