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
    leaf: {
      constructor: {
        type: 'Text',
        parameters: [{ label: 'verbatim', type: 'Swift.String' }],
      },
      args: [{ label: 'verbatim', field: 'text' }],
    },
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
    leaf: {
      constructor: {
        type: 'Label',
        parameters: [
          { label: '_', type: 'SwiftUICore.LocalizedStringKey' },
          { label: 'systemImage', type: 'Swift.String' },
        ],
      },
      args: [
        { label: '_', localizedKey: 'label' },
        { label: 'systemImage', field: 'systemImage' },
      ],
    },
    swift: `Label(LocalizedStringKey(model.label), systemImage: model.systemImage)`,
    validate: `  if (typeof label !== 'string' || !label) throw new Error('Label label must be a non-empty string')
  if (typeof systemImage !== 'string' || !systemImage) throw new Error('Label systemImage must be a non-empty SF Symbol name')`,
  },
  {
    name: 'Button',
    actions: [{ prop: 'onPress', event: 'Press' }],
    fields: {
      ...commonFields,
      // the second line of a two-line row, under the label in secondary style.
      subtitle: { type: 'string', default: '' },
      systemImage: { type: 'string', default: '' },
      // react-native's ViewProps already owns `role` for the accessibility role.
      buttonRole: { type: 'string', default: '', enum: 'ButtonRole' },
      buttonStyle: {
        type: 'string',
        default: 'automatic',
        enum: 'PrimitiveButtonStyle',
      },
      // turns the row into the "Change flight >" shape a form uses for a row that opens
      // something, by pushing a secondary chevron to the trailing edge.
      disclosureIndicator: { type: 'boolean', default: false },
      controlSize: { type: 'string', default: '', enum: 'ControlSize' },
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
        if model.subtitle.isEmpty {
          model.oneNativePrimary
        } else {
          VStack(alignment: .leading, spacing: 2) {
            model.oneNativePrimary
            Text(model.subtitle).font(.subheadline).foregroundStyle(.secondary)
          }
        }
      }
      .oneNativeButtonStyle(model.buttonStyle)
      .oneNativeControlSize(model.controlSize)`,
    validate: `  if (typeof label !== 'string') throw new Error('Button label must be a string')
  if (!label && !systemImage) throw new Error('Button needs a label, a systemImage, or both')`,
    extraSwift: `private extension ButtonModel {
  // the label is the same whether or not a disclosure indicator follows it, so the
  // image-or-text rule is written once. an icon-only button renders the image alone
  // rather than a label with an empty title, so no title spacing is reserved.
  @ViewBuilder var oneNativeLabel: some View {
    if !label.isEmpty, !systemImage.isEmpty { Label(label, systemImage: systemImage) }
    else if !systemImage.isEmpty { Image(systemName: systemImage) }
    else { Text(label) }
  }
  // the primary line is the same with or without a subtitle under it.
  @ViewBuilder var oneNativePrimary: some View {
    if disclosureIndicator {
      HStack {
        oneNativeLabel
        Spacer()
        Image(systemName: "chevron.right").foregroundStyle(.secondary)
      }
      .frame(maxWidth: .infinity)
    } else {
      oneNativeLabel
    }
  }
}`,
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
      controlSize: { type: 'string', default: '', enum: 'ControlSize' },
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
      .oneNativeProgressViewStyle(model.progressViewStyle)
      .oneNativeControlSize(model.controlSize)`,
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
      controlSize: { type: 'string', default: '', enum: 'ControlSize' },
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
    leaf: {
      constructor: {
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
      args: [
        { label: 'value', field: 'value' },
        { label: 'in', range: ['minimumValue', 'maximumValue'] },
        { label: 'label', text: 'label' },
        { label: 'currentValueLabel', text: 'currentValueLabel' },
        { label: 'minimumValueLabel', text: 'minimumValueLabel' },
        { label: 'maximumValueLabel', text: 'maximumValueLabel' },
      ],
    },
    swift: `Gauge(value: model.value, in: model.minimumValue...model.maximumValue) {
        Text(model.label)
      } currentValueLabel: {
        Text(model.currentValueLabel)
      } minimumValueLabel: {
        Text(model.minimumValueLabel)
      } maximumValueLabel: {
        Text(model.maximumValueLabel)
      }
      .oneNativeGaugeStyle(model.gaugeStyle)
      .oneNativeControlSize(model.controlSize)`,
    validate: `  if (![value, minimumValue, maximumValue].every(Number.isFinite)) throw new Error('Gauge value, minimumValue, and maximumValue must be finite numbers')
  if (minimumValue >= maximumValue) throw new Error('Gauge minimumValue must be less than maximumValue')
  if (value < minimumValue || value > maximumValue) throw new Error('Gauge value must be within minimumValue and maximumValue')`,
  },
  {
    name: 'Image',
    decorativeWhenUnlabeled: true,
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
      colorRole: { type: 'string', default: '', publicType: 'IconColorRole' },
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
      .oneNativeImageScale(model.imageScale)
      .oneNativeColorRole(model.colorRole)`,
    validate: `  if (typeof systemName !== 'string' || !systemName) throw new Error('Image systemName must be a non-empty SF Symbol name')
  if (variableValue !== undefined && !Number.isFinite(variableValue)) throw new Error('Image variableValue must be a finite number or undefined')
  if (variableValue !== undefined && (variableValue < 0 || variableValue > 1)) throw new Error('Image variableValue must be between 0 and 1')
  if (colorRole && !iconColorRoles.includes(colorRole)) throw new Error('Image colorRole must be a One.UI icon color role')`,
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
  {
    // status dots and swatches. a shape with neither fill nor stroke renders the SDK
    // default, which is the foreground style; setting one paints it instead, and
    // setting both overlays the stroke on the fill the way SwiftUI composes them.
    name: 'Circle',
    decorativeWhenUnlabeled: true,
    fields: {
      fill: { type: 'color', default: null, jsDefault: 'undefined' },
      stroke: { type: 'color', default: null, jsDefault: 'undefined' },
      lineWidth: { type: 'Double', default: 1 },
    },
    constructors: [{ type: 'Circle', parameters: [] }],
    swift: `Group {
        if let fill = model.fill, let stroke = model.stroke {
          Circle().fill(Color(uiColor: fill))
            .overlay(Circle().stroke(Color(uiColor: stroke), lineWidth: model.lineWidth))
        } else if let fill = model.fill {
          Circle().fill(Color(uiColor: fill))
        } else if let stroke = model.stroke {
          Circle().stroke(Color(uiColor: stroke), lineWidth: model.lineWidth)
        } else {
          Circle()
        }
      }`,
    validate: `  if (!Number.isFinite(lineWidth) || lineWidth < 0) throw new Error('Circle lineWidth must be a non-negative number')`,
  },
  {
    name: 'Capsule',
    decorativeWhenUnlabeled: true,
    fields: {
      fill: { type: 'color', default: null, jsDefault: 'undefined' },
      stroke: { type: 'color', default: null, jsDefault: 'undefined' },
      lineWidth: { type: 'Double', default: 1 },
    },
    constructors: [
      {
        type: 'Capsule',
        parameters: [{ label: 'style', type: 'SwiftUICore.RoundedCornerStyle' }],
      },
    ],
    swift: `Group {
        if let fill = model.fill, let stroke = model.stroke {
          Capsule().fill(Color(uiColor: fill))
            .overlay(Capsule().stroke(Color(uiColor: stroke), lineWidth: model.lineWidth))
        } else if let fill = model.fill {
          Capsule().fill(Color(uiColor: fill))
        } else if let stroke = model.stroke {
          Capsule().stroke(Color(uiColor: stroke), lineWidth: model.lineWidth)
        } else {
          Capsule()
        }
      }`,
    validate: `  if (!Number.isFinite(lineWidth) || lineWidth < 0) throw new Error('Capsule lineWidth must be a non-negative number')`,
  },
  {
    name: 'Rectangle',
    decorativeWhenUnlabeled: true,
    fields: {
      fill: { type: 'color', default: null, jsDefault: 'undefined' },
      stroke: { type: 'color', default: null, jsDefault: 'undefined' },
      lineWidth: { type: 'Double', default: 1 },
    },
    constructors: [{ type: 'Rectangle', parameters: [] }],
    swift: `Group {
        if let fill = model.fill, let stroke = model.stroke {
          Rectangle().fill(Color(uiColor: fill))
            .overlay(Rectangle().stroke(Color(uiColor: stroke), lineWidth: model.lineWidth))
        } else if let fill = model.fill {
          Rectangle().fill(Color(uiColor: fill))
        } else if let stroke = model.stroke {
          Rectangle().stroke(Color(uiColor: stroke), lineWidth: model.lineWidth)
        } else {
          Rectangle()
        }
      }`,
    validate: `  if (!Number.isFinite(lineWidth) || lineWidth < 0) throw new Error('Rectangle lineWidth must be a non-negative number')`,
  },
  {
    // the corner radius is the SDK's own initializer argument; a zero radius is a
    // rectangle, which is why the default is 0 rather than a style.
    name: 'RoundedRectangle',
    decorativeWhenUnlabeled: true,
    fields: {
      fill: { type: 'color', default: null, jsDefault: 'undefined' },
      stroke: { type: 'color', default: null, jsDefault: 'undefined' },
      lineWidth: { type: 'Double', default: 1 },
      cornerRadius: { type: 'Double', default: 0 },
    },
    constructors: [
      {
        type: 'RoundedRectangle',
        parameters: [
          { label: 'cornerRadius', type: 'CoreFoundation.CGFloat' },
          { label: 'style', type: 'SwiftUICore.RoundedCornerStyle' },
        ],
      },
    ],
    swift: `Group {
        if let fill = model.fill, let stroke = model.stroke {
          RoundedRectangle(cornerRadius: model.cornerRadius).fill(Color(uiColor: fill))
            .overlay(RoundedRectangle(cornerRadius: model.cornerRadius).stroke(Color(uiColor: stroke), lineWidth: model.lineWidth))
        } else if let fill = model.fill {
          RoundedRectangle(cornerRadius: model.cornerRadius).fill(Color(uiColor: fill))
        } else if let stroke = model.stroke {
          RoundedRectangle(cornerRadius: model.cornerRadius).stroke(Color(uiColor: stroke), lineWidth: model.lineWidth)
        } else {
          RoundedRectangle(cornerRadius: model.cornerRadius)
        }
      }`,
    validate: `  if (!Number.isFinite(lineWidth) || lineWidth < 0) throw new Error('RoundedRectangle lineWidth must be a non-negative number')
  if (!Number.isFinite(cornerRadius) || cornerRadius < 0) throw new Error('RoundedRectangle cornerRadius must be a non-negative number')`,
  },
  {
    name: 'Ellipse',
    decorativeWhenUnlabeled: true,
    fields: {
      fill: { type: 'color', default: null, jsDefault: 'undefined' },
      stroke: { type: 'color', default: null, jsDefault: 'undefined' },
      lineWidth: { type: 'Double', default: 1 },
    },
    constructors: [{ type: 'Ellipse', parameters: [] }],
    swift: `Group {
        if let fill = model.fill, let stroke = model.stroke {
          Ellipse().fill(Color(uiColor: fill))
            .overlay(Ellipse().stroke(Color(uiColor: stroke), lineWidth: model.lineWidth))
        } else if let fill = model.fill {
          Ellipse().fill(Color(uiColor: fill))
        } else if let stroke = model.stroke {
          Ellipse().stroke(Color(uiColor: stroke), lineWidth: model.lineWidth)
        } else {
          Ellipse()
        }
      }`,
    validate: `  if (!Number.isFinite(lineWidth) || lineWidth < 0) throw new Error('Ellipse lineWidth must be a non-negative number')`,
  },
]
