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

export const shapeControls: Control[] = [
  {
    name: 'Circle',
    layout: 'fill',
    fields: {
      fill: fillField,
    },
    constructors: [{ type: 'Circle', parameters: [] }],
    swift: fillSwift('Circle()'),
    validate: ``,
  },
  {
    name: 'Capsule',
    layout: 'fill',
    fields: {
      fill: fillField,
    },
    constructors: [
      {
        type: 'Capsule',
        parameters: [{ label: 'style', type: 'SwiftUICore.RoundedCornerStyle' }],
      },
    ],
    swift: fillSwift('Capsule()'),
    validate: ``,
  },
  {
    name: 'Rectangle',
    layout: 'fill',
    fields: {
      fill: fillField,
    },
    constructors: [{ type: 'Rectangle', parameters: [] }],
    swift: fillSwift('Rectangle()'),
    validate: ``,
  },
  {
    name: 'RoundedRectangle',
    layout: 'fill',
    fields: {
      fill: fillField,
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
    swift: fillSwift('RoundedRectangle(cornerRadius: model.cornerRadius)'),
    validate: `  if (!Number.isFinite(cornerRadius) || cornerRadius < 0) throw new Error('RoundedRectangle cornerRadius must be a non-negative number')`,
  },
  {
    name: 'Ellipse',
    layout: 'fill',
    fields: {
      fill: fillField,
    },
    constructors: [{ type: 'Ellipse', parameters: [] }],
    swift: fillSwift('Ellipse()'),
    validate: ``,
  },
]
