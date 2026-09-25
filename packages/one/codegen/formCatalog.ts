import { commonFields, type Control } from './controlTypes'

export const formControls: Control[] = [
  {
    name: 'Toggle',
    value: { type: 'boolean', prop: 'isOn', event: 'onIsOnChange', initial: false },
    fields: {
      ...commonFields,
      systemImage: { type: 'string', default: '' },
      toggleStyle: { type: 'string', default: 'automatic', enum: 'ToggleStyle' },
    },
    constructors: [
      {
        type: 'Toggle',
        parameters: [
          { label: 'isOn', type: 'SwiftUICore.Binding<Swift.Bool>' },
          { label: 'label', type: '() -> Label' },
        ],
      },
      {
        type: 'Toggle',
        parameters: [
          { label: '_', type: 'SwiftUICore.LocalizedStringKey' },
          { label: 'systemImage', type: 'Swift.String' },
          { label: 'isOn', type: 'SwiftUICore.Binding<Swift.Bool>' },
        ],
      },
    ],
    // a systemImage takes the SDK's Toggle(_:systemImage:isOn:) instead of the label
    // closure, so the body branches and the leaf recipe (one constructor) no longer
    // applies. an empty image keeps the text-only initializer byte for byte.
    swift: `Group {
        if model.systemImage.isEmpty {
          Toggle(isOn: Binding(
            get: { model.controlled.value },
            set: { value in model.change(value) }
          )) {
            Text(model.label)
          }
        } else {
          Toggle(LocalizedStringKey(model.label), systemImage: model.systemImage, isOn: Binding(
            get: { model.controlled.value },
            set: { value in model.change(value) }
          ))
        }
      }
      .oneNativeToggleStyle(model.toggleStyle)`,
    validate: `  if (typeof isOn !== 'boolean') throw new Error('Toggle isOn must be a boolean')
  if (typeof systemImage !== 'string') throw new Error('Toggle systemImage must be a string')`,
  },
  {
    name: 'Slider',
    value: { type: 'Double', prop: 'value', event: 'onValueChange', initial: 0 },
    fields: {
      ...commonFields,
      minimumValue: { type: 'Double', default: 0 },
      maximumValue: { type: 'Double', default: 100 },
      step: { type: 'Double', default: 1 },
      minimumValueLabel: { type: 'string', default: '' },
      maximumValueLabel: { type: 'string', default: '' },
      minimumValueImage: { type: 'string', default: '' },
      maximumValueImage: { type: 'string', default: '' },
    },
    constructors: [
      {
        type: 'Slider',
        parameters: [
          { label: 'value', type: 'SwiftUICore.Binding<V>' },
          { label: 'in', type: 'Swift.ClosedRange<V>' },
          { label: 'step', type: 'V.Stride' },
          { label: 'label', type: '() -> Label' },
          { label: 'onEditingChanged', type: '@escaping (Swift.Bool) -> Swift.Void' },
        ],
      },
      {
        type: 'Slider',
        parameters: [
          { label: 'value', type: 'SwiftUICore.Binding<V>' },
          { label: 'in', type: 'Swift.ClosedRange<V>' },
          { label: 'step', type: 'V.Stride' },
          { label: 'label', type: '() -> Label' },
          { label: 'minimumValueLabel', type: '() -> ValueLabel' },
          { label: 'maximumValueLabel', type: '() -> ValueLabel' },
          { label: 'onEditingChanged', type: '@escaping (Swift.Bool) -> Swift.Void' },
        ],
      },
    ],
    // a slider that sets none of the four value labels keeps the SDK's no-value-label
    // initializer, so every slider written before these props existed renders unchanged.
    swift: `Group {
        if model.minimumValueImage.isEmpty, model.minimumValueLabel.isEmpty,
          model.maximumValueImage.isEmpty, model.maximumValueLabel.isEmpty {
          Slider(value: oneNativeSliderBinding(model), in: model.minimumValue...model.maximumValue, step: model.step) {
            Text(model.label)
          } onEditingChanged: { _ in }
        } else {
          Slider(value: oneNativeSliderBinding(model), in: model.minimumValue...model.maximumValue, step: model.step) {
            Text(model.label)
          } minimumValueLabel: {
            oneNativeSliderValueLabel(image: model.minimumValueImage, label: model.minimumValueLabel)
          } maximumValueLabel: {
            oneNativeSliderValueLabel(image: model.maximumValueImage, label: model.maximumValueLabel)
          } onEditingChanged: { _ in }
        }
      }`,
    extraSwift: `private func oneNativeSliderBinding(_ model: SliderModel) -> Binding<Double> {
  Binding(get: { model.controlled.value }, set: { value in model.change(value) })
}

// an image wins over a label on the same side; neither one set draws nothing there.
@ViewBuilder private func oneNativeSliderValueLabel(image: String, label: String) -> some View {
  if !image.isEmpty { Image(systemName: image) }
  else if !label.isEmpty { Text(label) }
  else { EmptyView() }
}`,
    validate: `  if (![value, minimumValue, maximumValue, step].every(Number.isFinite)) throw new Error('Slider value, minimumValue, maximumValue, and step must be finite numbers')
  if (minimumValue >= maximumValue) throw new Error('Slider minimumValue must be less than maximumValue')
  if (step <= 0) throw new Error('Slider step must be greater than 0')
  if (value < minimumValue || value > maximumValue) throw new Error('Slider value must be within minimumValue and maximumValue')`,
  },
  {
    name: 'Stepper',
    value: { type: 'Double', prop: 'value', event: 'onValueChange', initial: 0 },
    fields: {
      ...commonFields,
      minimumValue: { type: 'Double', default: 0 },
      maximumValue: { type: 'Double', default: 100 },
      step: { type: 'Double', default: 1 },
    },
    constructors: [
      {
        type: 'Stepper',
        parameters: [
          { label: 'value', type: 'SwiftUICore.Binding<V>' },
          { label: 'in', type: 'Swift.ClosedRange<V>' },
          { label: 'step', type: 'V.Stride' },
          { label: 'label', type: '() -> Label' },
          { label: 'onEditingChanged', type: '@escaping (Swift.Bool) -> Swift.Void' },
        ],
      },
    ],
    leaf: {
      constructor: {
        type: 'Stepper',
        parameters: [
          { label: 'value', type: 'SwiftUICore.Binding<V>' },
          { label: 'in', type: 'Swift.ClosedRange<V>' },
          { label: 'step', type: 'V.Stride' },
          { label: 'label', type: '() -> Label' },
          { label: 'onEditingChanged', type: '@escaping (Swift.Bool) -> Swift.Void' },
        ],
      },
      args: [
        { label: 'value', binding: 'controlled' },
        { label: 'in', range: ['minimumValue', 'maximumValue'] },
        { label: 'step', field: 'step' },
        { label: 'label', text: 'label' },
        { label: 'onEditingChanged', discard: true },
      ],
    },
    swift: `Stepper(value: Binding(
        get: { model.controlled.value },
        set: { value in model.change(value) }
      ), in: model.minimumValue...model.maximumValue, step: model.step) {
        Text(model.label)
      } onEditingChanged: { _ in }`,
    validate: `  if (![value, minimumValue, maximumValue, step].every(Number.isFinite)) throw new Error('Stepper value, minimumValue, maximumValue, and step must be finite numbers')
  if (minimumValue >= maximumValue) throw new Error('Stepper minimumValue must be less than maximumValue')
  if (step <= 0) throw new Error('Stepper step must be greater than 0')
  if (value < minimumValue || value > maximumValue) throw new Error('Stepper value must be within minimumValue and maximumValue')`,
  },
]
