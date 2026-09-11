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
      pickerStyle: { type: 'string', default: 'automatic', enum: 'PickerStyle' },
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
      }
      .oneNativePickerStyle(model.pickerStyle)`,
    validate: `  if (!Array.isArray(options) || options.some(option => typeof option?.value !== 'string' || typeof option?.label !== 'string')) throw new Error('Picker options must contain string value and label fields')
  if (!options.length) throw new Error('Picker options must not be empty')
  if (new Set(options.map(option => option.value)).size !== options.length) throw new Error('Picker option values must be unique')
  if (!options.some(option => option.value === selection)) throw new Error('Picker selection must match an option value')
  if (pickerStyle === 'navigationLink' || pickerStyle === 'palette') throw new Error('PickerStyle.' + pickerStyle + ' requires a native container context that One Native does not provide yet')`,
    height: {
      default: 44,
      when: [{ prop: 'pickerStyle', values: ['wheel', 'inline'], height: 216 }],
    },
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
      minimumDate: {
        type: 'Double',
        default: -62135769600000,
        publicType: 'Date',
        jsDefault: 'new Date(-62135769600000)',
        nativeValue: 'minimumDate.getTime()',
      },
      maximumDate: {
        type: 'Double',
        default: 64092211200000,
        publicType: 'Date',
        jsDefault: 'new Date(64092211200000)',
        nativeValue: 'maximumDate.getTime()',
      },
      displayedComponents: {
        type: 'string',
        default: 'dateAndTime',
        publicType: "'date' | 'hourAndMinute' | 'dateAndTime'",
      },
      datePickerStyle: { type: 'string', default: 'automatic', enum: 'DatePickerStyle' },
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
      }
      .oneNativeDatePickerStyle(model.datePickerStyle)`,
    extraSwift: `private func oneNativeDatePickerComponents(_ value: String) -> DatePicker<Text>.Components {
  switch value {
  case "date": return .date
  case "hourAndMinute": return .hourAndMinute
  case "dateAndTime": return [.date, .hourAndMinute]
  default: preconditionFailure("unsupported DatePicker displayedComponents: \\(value)")
  }
}`,
    validate: `  const selectionTime = selection instanceof Date ? selection.getTime() : NaN
  const minimumTime = minimumDate instanceof Date ? minimumDate.getTime() : NaN
  const maximumTime = maximumDate instanceof Date ? maximumDate.getTime() : NaN
  if (![selectionTime, minimumTime, maximumTime].every(Number.isFinite)) throw new Error('DatePicker selection, minimumDate, and maximumDate must be valid Date values')
  if (minimumTime > maximumTime) throw new Error('DatePicker minimumDate must not be after maximumDate')
  if (selectionTime < minimumTime || selectionTime > maximumTime) throw new Error('DatePicker selection must be within minimumDate and maximumDate')
  if (!['date', 'hourAndMinute', 'dateAndTime'].includes(displayedComponents)) throw new Error('DatePicker displayedComponents must be date, hourAndMinute, or dateAndTime')`,
    height: {
      default: 44,
      when: [
        { prop: 'datePickerStyle', values: ['graphical'], height: 360 },
        { prop: 'datePickerStyle', values: ['wheel'], height: 216 },
      ],
    },
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
    height: { default: 44 },
  },
]
