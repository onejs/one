import {
  actionButtons,
  actionsField,
  actionsValidate,
  commonFields,
  type Control,
} from './controlTypes'

// leaves with no two-way value: Button signals, Text/Label/ProgressView/Gauge display.
export const leafControls: Control[] = [
  {
    name: 'Text',
    fields: { text: { type: 'string', default: '' } },
    constructors: [
      { type: 'Text', parameters: [{ label: 'verbatim', type: 'Swift.String' }] },
    ],
    swift: `Text(verbatim: model.text)`,
    validate: `  if (typeof text !== 'string') throw new Error('Text text must be a string')`,
  },
  {
    name: 'Label',
    fields: {
      ...commonFields,
      systemImage: { type: 'string', default: '' },
    },
    constructors: [
      {
        type: 'Label',
        parameters: [
          { label: '_', type: 'SwiftUICore.LocalizedStringKey' },
          { label: 'systemImage', type: 'Swift.String' },
        ],
      },
    ],
    swift: `Label(LocalizedStringKey(model.label), systemImage: model.systemImage)`,
    validate: `  if (typeof label !== 'string' || !label) throw new Error('Label label must be a non-empty string')
  if (typeof systemImage !== 'string' || !systemImage) throw new Error('Label systemImage must be a non-empty SF Symbol name')`,
  },
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
  },
  {
    name: 'Image',
    fields: {
      systemName: { type: 'string', default: '' },
      symbolRenderingMode: {
        type: 'string',
        default: '',
        enum: 'SymbolRenderingMode',
      },
      symbolVariant: {
        type: 'string',
        default: '',
        enum: 'SymbolVariants',
      },
      imageScale: {
        type: 'string',
        default: '',
        enum: 'ImageScale',
      },
      variableValue: {
        type: 'Double',
        default: 0,
        jsDefault: 'undefined',
        nativeValue: 'variableValue ?? 0',
      },
      hasVariableValue: {
        type: 'boolean',
        default: false,
        derived: true,
        nativeValue: 'variableValue !== undefined',
      },
    },
    constructors: [
      {
        type: 'Image',
        parameters: [{ label: 'systemName', type: 'Swift.String' }],
      },
      {
        type: 'Image',
        parameters: [
          { label: 'systemName', type: 'Swift.String' },
          { label: 'variableValue', type: 'Swift.Double?' },
        ],
      },
    ],
    swift: `Group {
        if model.hasVariableValue {
          Image(systemName: model.systemName, variableValue: model.variableValue)
        } else {
          Image(systemName: model.systemName)
        }
      }
      .oneNativeSymbolRenderingMode(model.symbolRenderingMode)
      .oneNativeSymbolVariant(model.symbolVariant)
      .oneNativeImageScale(model.imageScale)`,
    validate: `  if (typeof systemName !== 'string' || !systemName) throw new Error('Image systemName must be a non-empty SF Symbol name')
  if (variableValue !== undefined && !Number.isFinite(variableValue)) throw new Error('Image variableValue must be a finite number or undefined')
  if (variableValue !== undefined && (variableValue < 0 || variableValue > 1)) throw new Error('Image variableValue must be between 0 and 1')`,
  },
  {
    // the share sheet is UIActivityViewController, which React Native has no equivalent for.
    // one item travels as a string and `itemType` says whether to share it as a link or as
    // text, because the SDK takes those through two different initializers.
    name: 'ShareLink',
    fields: {
      ...commonFields,
      systemImage: { type: 'string', default: '' },
      item: { type: 'string', default: '' },
      itemType: { type: 'string', default: 'text', publicType: "'text' | 'url'" },
      subject: { type: 'string', default: '' },
      message: { type: 'string', default: '' },
    },
    constructors: [
      {
        type: 'ShareLink',
        parameters: [
          { label: 'item', type: 'Foundation.URL' },
          { label: 'subject', type: 'SwiftUICore.Text?' },
          { label: 'message', type: 'SwiftUICore.Text?' },
          { label: 'label', type: '() -> Label' },
        ],
      },
      {
        type: 'ShareLink',
        parameters: [
          { label: 'item', type: 'Swift.String' },
          { label: 'subject', type: 'SwiftUICore.Text?' },
          { label: 'message', type: 'SwiftUICore.Text?' },
          { label: 'label', type: '() -> Label' },
        ],
      },
    ],
    swift: `ShareLinkSurface(model: model)`,
    extraSwift: `private struct ShareLinkSurface: View {
  @ObservedObject var model: ShareLinkModel
  // an empty string is no subject and no message, which the SDK spells as nil.
  private var subject: Text? { model.subject.isEmpty ? nil : Text(model.subject) }
  private var message: Text? { model.message.isEmpty ? nil : Text(model.message) }
  @ViewBuilder private var label: some View {
    if model.systemImage.isEmpty { Text(model.label) }
    else { Label(model.label, systemImage: model.systemImage) }
  }
  var body: some View {
    // a url that does not parse falls through to sharing the text, which is what it is.
    if model.itemType == "url", let url = URL(string: model.item) {
      ShareLink(item: url, subject: subject, message: message) { label }
    } else {
      ShareLink(item: model.item, subject: subject, message: message) { label }
    }
  }
}
`,
    validate: `  if (typeof label !== 'string' || !label) throw new Error('ShareLink label must be a non-empty string')
  if (typeof item !== 'string' || !item) throw new Error('ShareLink item must be a non-empty string')
  if (itemType !== 'text' && itemType !== 'url') throw new Error("ShareLink itemType must be 'text' or 'url'")`,
  },
  {
    // the empty state Apple ships, including the search variant's look. its buttons are the
    // same id-reporting action list the dialogs carry.
    name: 'ContentUnavailableView',
    // an empty state is given an area to fill, the way a video or a map is; it has no row
    // height of its own.
    layout: 'fill',
    actions: [{ prop: 'onAction', event: 'Action', payload: { id: 'string' } }],
    fields: {
      title: { type: 'string', default: '' },
      systemImage: { type: 'string', default: '' },
      description: { type: 'string', default: '' },
      actions: actionsField,
    },
    constructors: [
      {
        type: 'ContentUnavailableView',
        parameters: [
          { label: 'label', type: '() -> Label' },
          { label: 'description', type: '() -> Description' },
          { label: 'actions', type: '() -> Actions' },
        ],
      },
    ],
    swift: `ContentUnavailableView {
        if model.systemImage.isEmpty {
          Text(model.title)
        } else {
          Label(model.title, systemImage: model.systemImage)
        }
      } description: {
        if !model.description.isEmpty { Text(model.description) }
      } actions: {
${actionButtons('        ')}
      }`,
    validate: `  if (typeof title !== 'string' || !title) throw new Error('ContentUnavailableView title must be a non-empty string')
${actionsValidate('ContentUnavailableView')}`,
  },
]
