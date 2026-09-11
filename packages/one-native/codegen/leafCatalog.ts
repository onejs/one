import { commonFields, type Control } from './controlTypes'

// leaves with no two-way value: Button signals, ProgressView and Gauge only display.
export const leafControls: Control[] = [
  {
    name: 'Button',
    actions: [{ prop: 'onPress', event: 'Press' }],
    fields: {
      ...commonFields,
      systemImage: { type: 'string', default: '' },
      // react-native's ViewProps already owns `role` for the accessibility role.
      buttonRole: { type: 'string', default: '', enum: 'ButtonRole' },
      buttonStyle: {
        type: 'string',
        default: 'automatic',
        enum: 'PrimitiveButtonStyle',
      },
    },
    constructors: [
      {
        type: 'Button',
        parameters: [
          { label: 'role', type: 'SwiftUI.ButtonRole?' },
          {
            label: 'action',
            type: '@escaping @_Concurrency.MainActor () -> Swift.Void',
          },
          { label: 'label', type: '() -> Label' },
        ],
      },
    ],
    swift: `Button(role: OneNativeGenerated.buttonRole(model.buttonRole), action: { model.press() }) {
        if model.systemImage.isEmpty {
          Text(model.label)
        } else {
          Label(model.label, systemImage: model.systemImage)
        }
      }
      .oneNativeButtonStyle(model.buttonStyle)`,
    validate: `  if (typeof label !== 'string' || !label) throw new Error('Button label must be a non-empty string')`,
    height: { default: 44 },
  },
  {
    name: 'ProgressView',
    fields: {
      ...commonFields,
      value: {
        type: 'Double',
        default: 0,
        jsDefault: 'undefined',
        nativeValue: 'value ?? 0',
      },
      total: { type: 'Double', default: 1 },
      // an omitted value is an indeterminate spinner; the SDK uses a separate initializer.
      indeterminate: {
        type: 'boolean',
        default: false,
        derived: true,
        nativeValue: 'value === undefined',
      },
      progressViewStyle: {
        type: 'string',
        default: 'automatic',
        enum: 'ProgressViewStyle',
      },
    },
    constructors: [
      {
        type: 'ProgressView',
        parameters: [
          { label: 'value', type: 'V?' },
          { label: 'total', type: 'V' },
          { label: 'label', type: '() -> Label' },
        ],
      },
      {
        type: 'ProgressView',
        parameters: [{ label: 'label', type: '() -> Label' }],
      },
    ],
    swift: `Group {
        if model.indeterminate {
          ProgressView { Text(model.label) }
        } else {
          ProgressView(value: model.value, total: model.total) { Text(model.label) }
        }
      }
      .oneNativeProgressViewStyle(model.progressViewStyle)`,
    validate: `  if (value !== undefined && !Number.isFinite(value)) throw new Error('ProgressView value must be a finite number or undefined')
  if (!Number.isFinite(total) || total <= 0) throw new Error('ProgressView total must be a finite number greater than 0')
  if (value !== undefined && (value < 0 || value > total)) throw new Error('ProgressView value must be between 0 and total')`,
    height: { default: 44 },
  },
  {
    name: 'Gauge',
    fields: {
      ...commonFields,
      value: { type: 'Double', default: 0 },
      minimumValue: { type: 'Double', default: 0 },
      maximumValue: { type: 'Double', default: 1 },
      currentValueLabel: { type: 'string', default: '' },
      minimumValueLabel: { type: 'string', default: '' },
      maximumValueLabel: { type: 'string', default: '' },
      gaugeStyle: { type: 'string', default: 'automatic', enum: 'GaugeStyle' },
    },
    constructors: [
      {
        type: 'Gauge',
        parameters: [
          { label: 'value', type: 'V' },
          { label: 'in', type: 'Swift.ClosedRange<V>' },
          { label: 'label', type: '() -> Label' },
          { label: 'currentValueLabel', type: '() -> CurrentValueLabel' },
          { label: 'minimumValueLabel', type: '() -> BoundsLabel' },
          { label: 'maximumValueLabel', type: '() -> BoundsLabel' },
        ],
      },
    ],
    swift: `Gauge(value: model.value, in: model.minimumValue...model.maximumValue) {
        Text(model.label)
      } currentValueLabel: {
        Text(model.currentValueLabel)
      } minimumValueLabel: {
        Text(model.minimumValueLabel)
      } maximumValueLabel: {
        Text(model.maximumValueLabel)
      }
      .oneNativeGaugeStyle(model.gaugeStyle)`,
    validate: `  if (![value, minimumValue, maximumValue].every(Number.isFinite)) throw new Error('Gauge value, minimumValue, and maximumValue must be finite numbers')
  if (minimumValue >= maximumValue) throw new Error('Gauge minimumValue must be less than maximumValue')
  if (value < minimumValue || value > maximumValue) throw new Error('Gauge value must be within minimumValue and maximumValue')`,
    height: {
      default: 44,
      when: [
        {
          prop: 'gaugeStyle',
          values: ['accessoryCircular', 'accessoryCircularCapacity'],
          height: 100,
        },
      ],
    },
  },
]
