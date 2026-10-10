import type { Control, ControlField } from './controlTypes'

// SwiftUI shapes as fill-layout leaves: a shape has no ideal height of its own, so it
// takes the width and height React Native gave it. each shape is its own control so the
// generated Swift names the SDK type directly instead of switching on a shape prop; the
// names match the glassEffectShape values catalog.ts validates for Swift.Glass, minus
// containerRelativeShape, which only resolves inside a container. fill is an optional
// color and an omitted fill keeps the SDK's own default rendering.
const fillField: ControlField = {
  type: 'color',
  default: '',
  jsDefault: 'undefined',
}

const fillSwift = (shape: string) => `Group {
        if let fill = model.fill {
          ${shape}.fill(Color(uiColor: fill))
        } else {
          ${shape}
        }
      }`

// an InsettableShape also takes .strokeBorder(_:lineWidth:), drawn inside its bounds and
// over its fill. ConcentricRectangle is not insettable in the SDK, so it keeps fill only.
const strokeFields: Record<string, ControlField> = {
  fill: fillField,
  strokeBorder: fillField,
  lineWidth: { type: 'Double', default: 1 },
}

const insettableSwift = (shape: string) => `Group {
        if let stroke = model.strokeBorder {
          if let fill = model.fill {
            ${shape}.fill(Color(uiColor: fill)).strokeBorder(Color(uiColor: stroke), lineWidth: model.lineWidth)
          } else {
            ${shape}.strokeBorder(Color(uiColor: stroke), lineWidth: model.lineWidth)
          }
        } else if let fill = model.fill {
          ${shape}.fill(Color(uiColor: fill))
        } else {
          ${shape}
        }
      }`

const lineWidthValidate = (name: string) =>
  `  if (!Number.isFinite(lineWidth) || lineWidth < 0) throw new Error('${name} lineWidth must be a non-negative number')`

export const shapeControls: Control[] = [
  {
    name: 'Circle',
    layout: 'fill',
    fields: {
      ...strokeFields,
    },
    constructors: [{ type: 'Circle', parameters: [] }],
    swift: insettableSwift('Circle()'),
    validate: lineWidthValidate('Circle'),
  },
  {
    name: 'Capsule',
    layout: 'fill',
    fields: {
      ...strokeFields,
    },
    constructors: [
      {
        type: 'Capsule',
        parameters: [{ label: 'style', type: 'SwiftUICore.RoundedCornerStyle' }],
      },
    ],
    swift: insettableSwift('Capsule()'),
    validate: lineWidthValidate('Capsule'),
  },
  {
    name: 'Rectangle',
    layout: 'fill',
    fields: {
      ...strokeFields,
    },
    constructors: [{ type: 'Rectangle', parameters: [] }],
    swift: insettableSwift('Rectangle()'),
    validate: lineWidthValidate('Rectangle'),
  },
  {
    name: 'RoundedRectangle',
    layout: 'fill',
    fields: {
      ...strokeFields,
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
    swift: insettableSwift('RoundedRectangle(cornerRadius: model.cornerRadius)'),
    validate: `  if (!Number.isFinite(cornerRadius) || cornerRadius < 0) throw new Error('RoundedRectangle cornerRadius must be a non-negative number')
${lineWidthValidate('RoundedRectangle')}`,
  },
  {
    name: 'Ellipse',
    layout: 'fill',
    fields: {
      ...strokeFields,
    },
    constructors: [{ type: 'Ellipse', parameters: [] }],
    swift: insettableSwift('Ellipse()'),
    validate: lineWidthValidate('Ellipse'),
  },
  {
    // one radius per corner, named and ordered as the SDK's per-corner initializer.
    name: 'UnevenRoundedRectangle',
    layout: 'fill',
    fields: {
      ...strokeFields,
      topLeadingRadius: { type: 'Double', default: 0 },
      bottomLeadingRadius: { type: 'Double', default: 0 },
      bottomTrailingRadius: { type: 'Double', default: 0 },
      topTrailingRadius: { type: 'Double', default: 0 },
    },
    constructors: [
      {
        type: 'UnevenRoundedRectangle',
        parameters: [
          { label: 'topLeadingRadius', type: 'CoreFoundation.CGFloat' },
          { label: 'bottomLeadingRadius', type: 'CoreFoundation.CGFloat' },
          { label: 'bottomTrailingRadius', type: 'CoreFoundation.CGFloat' },
          { label: 'topTrailingRadius', type: 'CoreFoundation.CGFloat' },
          { label: 'style', type: 'SwiftUICore.RoundedCornerStyle' },
        ],
      },
    ],
    swift: insettableSwift(
      'UnevenRoundedRectangle(topLeadingRadius: model.topLeadingRadius, bottomLeadingRadius: model.bottomLeadingRadius, bottomTrailingRadius: model.bottomTrailingRadius, topTrailingRadius: model.topTrailingRadius)'
    ),
    validate: `  for (const radius of [topLeadingRadius, bottomLeadingRadius, bottomTrailingRadius, topTrailingRadius])
    if (!Number.isFinite(radius) || radius < 0) throw new Error('UnevenRoundedRectangle radii must be non-negative numbers')
${lineWidthValidate('UnevenRoundedRectangle')}`,
  },
  {
    // the corner shape comes from SwiftUI's container shape and inset context.
    name: 'ConcentricRectangle',
    layout: 'fill',
    fields: { fill: fillField },
    constructors: [{ type: 'ConcentricRectangle', parameters: [] }],
    swift: `Group {
        if #available(iOS 26.0, *) {
          ${fillSwift('ConcentricRectangle()')}
        } else {
          EmptyView()
        }
      }`,
    validate: `  if (Number.parseFloat(String(Platform.Version)) < 26) throw new Error('ConcentricRectangle requires iOS 26 or newer')`,
  },
]
