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
      .oneNativePickerStyle(model.pickerStyle)
      .oneNativeSegmentedFill(model.pickerStyle)`,
    extraSwift: `private extension View {
  // a segmented picker spans its row the way Settings does instead of hugging its
  // segments, so callers never have to encode the fill themselves.
  @ViewBuilder func oneNativeSegmentedFill(_ style: String) -> some View {
    if style == "segmented" { self.frame(maxWidth: .infinity) }
    else { self }
  }
}`,
    validate: `  if (!Array.isArray(options) || options.some(option => typeof option?.value !== 'string' || typeof option?.label !== 'string')) throw new Error('Picker options must contain string value and label fields')
  if (!options.length) throw new Error('Picker options must not be empty')
  if (new Set(options.map(option => option.value)).size !== options.length) throw new Error('Picker option values must be unique')
  if (!options.some(option => option.value === selection)) throw new Error('Picker selection must match an option value')
  if (pickerStyle === 'navigationLink' || pickerStyle === 'palette') throw new Error('PickerStyle.' + pickerStyle + ' requires a native container context that One Native does not provide yet')`,
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
  },
  {
    name: 'MultiDatePicker',
    value: {
      type: 'string',
      prop: 'selection',
      event: 'onSelectionChange',
      initial: '[]',
      publicType: 'readonly string[]',
      nativeValue: 'JSON.stringify([...selection].sort())',
      eventValue: 'JSON.parse(event.value) as string[]',
    },
    fields: { ...commonFields },
    constructors: [{
      type: 'MultiDatePicker',
      parameters: [
        { label: 'selection', type: 'SwiftUICore.Binding<Swift.Set<Foundation.DateComponents>>' },
        { label: 'label', type: '() -> Label' },
      ],
    }],
    swift: `MultiDatePickerSurface(model: model)`,
    extraSwift: `private struct MultiDatePickerSurface: View {
  @ObservedObject var model: MultiDatePickerModel
  @Environment(\\.calendar) private var calendar
  @Environment(\\.timeZone) private var timeZone

  var body: some View {
    MultiDatePicker(selection: Binding(
      get: { oneNativeMultiDateDecode(model.controlled.value, calendar: calendar, timeZone: timeZone) },
      set: { value in model.change(oneNativeMultiDateEncode(value, calendar: calendar, timeZone: timeZone)) }
    )) {
      Text(model.label)
    }
  }
}

// The JS value names a Gregorian calendar day, while SwiftUI presents that
// same day with its environment calendar. Noon avoids midnight DST gaps.
private func oneNativeMultiDateDecode(_ value: String, calendar: Calendar, timeZone: TimeZone) -> Set<DateComponents> {
  guard let days = try? JSONDecoder().decode([String].self, from: Data(value.utf8)) else {
    NSLog("OneNativeMultiDatePicker: invalid selection JSON")
    return []
  }
  var gregorian = Calendar(identifier: .gregorian)
  gregorian.timeZone = timeZone
  var native = calendar
  native.timeZone = timeZone
  return Set(days.compactMap { day -> DateComponents? in
    let parts = day.split(separator: "-", omittingEmptySubsequences: false)
    guard parts.count == 3,
      let year = Int(parts[0]), let month = Int(parts[1]), let dayOfMonth = Int(parts[2]),
      let date = gregorian.date(from: DateComponents(year: year, month: month, day: dayOfMonth, hour: 12))
    else {
      NSLog("OneNativeMultiDatePicker: invalid calendar day")
      return nil
    }
    let checked = gregorian.dateComponents([.year, .month, .day], from: date)
    guard checked.year == year && checked.month == month && checked.day == dayOfMonth else {
      NSLog("OneNativeMultiDatePicker: normalized invalid calendar day")
      return nil
    }
    let mapped = native.dateComponents([.era, .year, .month, .day, .isLeapMonth], from: date)
    guard let nativeYear = mapped.year, let nativeMonth = mapped.month, let nativeDay = mapped.day else {
      NSLog("OneNativeMultiDatePicker: current calendar has no complete day")
      return nil
    }
    var result = DateComponents(year: nativeYear, month: nativeMonth, day: nativeDay)
    if native.identifier == .japanese { result.era = mapped.era }
    if mapped.isLeapMonth == true { result.isLeapMonth = true }
    return result
  })
}

private func oneNativeMultiDateEncode(_ selection: Set<DateComponents>, calendar: Calendar, timeZone: TimeZone) -> String {
  var gregorian = Calendar(identifier: .gregorian)
  gregorian.timeZone = timeZone
  var native = calendar
  native.timeZone = timeZone
  let days = selection.compactMap { day -> String? in
    guard let year = day.year, let month = day.month, let dayOfMonth = day.day else {
      NSLog("OneNativeMultiDatePicker: SwiftUI returned an incomplete day")
      return nil
    }
    var components = DateComponents(era: day.era, year: year, month: month, day: dayOfMonth, hour: 12)
    components.isLeapMonth = day.isLeapMonth
    guard let date = native.date(from: components) else {
      NSLog("OneNativeMultiDatePicker: SwiftUI returned an invalid calendar day")
      return nil
    }
    let mapped = gregorian.dateComponents([.year, .month, .day], from: date)
    guard let isoYear = mapped.year, let isoMonth = mapped.month, let isoDay = mapped.day,
      (1...9999).contains(isoYear) else {
      NSLog("OneNativeMultiDatePicker: selected day is outside the supported ISO range")
      return nil
    }
    return String(format: "%04d-%02d-%02d", isoYear, isoMonth, isoDay)
  }.sorted()
  guard let data = try? JSONEncoder().encode(days), let json = String(data: data, encoding: .utf8) else {
    NSLog("OneNativeMultiDatePicker: could not encode selected days")
    return "[]"
  }
  return json
}`,
    validate: `  if (!Array.isArray(selection) || selection.some(day =>
    typeof day !== 'string' || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(day) ||
    Number(day.slice(0, 4)) < 1 || Number.isNaN(Date.parse(day + 'T00:00:00Z')) ||
    new Date(day + 'T00:00:00Z').toISOString().slice(0, 10) !== day
  )) throw new Error('MultiDatePicker selection must contain valid YYYY-MM-DD calendar days')
  if (new Set(selection).size !== selection.length) throw new Error('MultiDatePicker selection days must be unique')`,
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
]
