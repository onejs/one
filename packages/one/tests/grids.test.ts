import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { gridItems, gridSpacing } from '../src/platform/gridTypes'

const schema = JSON.parse(readFileSync(new URL('../schema.json', import.meta.url), 'utf8'))
const component = (name: string) =>
  schema.components.find((entry: { publicName: string }) => entry.publicName === name)

describe('SwiftUI grids', () => {
  it('publishes four composed native containers with their grid values', () => {
    expect(component('LazyVGrid')).toMatchObject({
      props: { columns: { type: 'string' }, alignment: { type: 'string' }, spacing: { type: 'string' } },
      slots: [{ content: 'one-native', cardinality: 'many' }],
    })
    expect(component('LazyHGrid')).toMatchObject({
      props: { rows: { type: 'string' }, alignment: { type: 'string' }, spacing: { type: 'string' } },
    })
    expect(component('Grid')).toMatchObject({
      props: { horizontalSpacing: { type: 'string' }, verticalSpacing: { type: 'string' } },
    })
    expect(component('GridRow')).toMatchObject({ props: { alignment: { type: 'string' } } })
  })

  it('preserves fixed, flexible, and adaptive GridItem sizes across Fabric', () => {
    expect(JSON.parse(gridItems([
      { size: 'fixed', value: 80 },
      { size: 'flexible', minimum: 20, maximum: 120, spacing: -4, alignment: 'topLeading' },
      { size: 'adaptive', minimum: 44 },
    ], 'Swift.LazyVGrid'))).toEqual([
      { size: 'fixed', value: 80, minimum: -1, maximum: -1, spacing: null, alignment: '' },
      { size: 'flexible', value: -1, minimum: 20, maximum: 120, spacing: -4, alignment: 'topLeading' },
      { size: 'adaptive', value: -1, minimum: 44, maximum: -1, spacing: null, alignment: '' },
    ])
    expect(gridSpacing(undefined, 'Swift.Grid')).toBe('null')
    expect(gridSpacing(-4, 'Swift.Grid')).toBe('-4')
  })

  it('rejects invalid grid data before it reaches SwiftUI', () => {
    expect(() => gridItems([{ size: 'fixed', value: -1 }], 'Grid')).toThrow('Grid item 0 value')
    expect(() => gridItems([{ size: 'adaptive', minimum: 0, maximum: -1 }], 'Grid')).toThrow('Grid item 0 maximum')
    expect(() => gridItems([{ size: 'flexible', minimum: 30, maximum: 20 }], 'Grid')).toThrow('Grid item 0 maximum must be at least minimum')
    expect(() => gridSpacing(Number.NaN, 'Swift.Grid')).toThrow('Swift.Grid spacing')
  })
})
