import { describe, expect, it } from 'vitest'
import {
  Swift,
  useSizeClass,
  getSizeClass,
  useHinge,
  getHinge,
  onHingeChange,
} from '../src/platform/index'

describe('ArrangementView and adaptive layout APIs', () => {
  it('exposes Swift.ArrangementView with subcomponents', () => {
    expect(Swift.ArrangementView).toBeDefined()
    expect(Swift.ArrangementView.Primary).toBeDefined()
    expect(Swift.ArrangementView.Secondary).toBeDefined()
    expect(Swift.ArrangementView.Leading).toBeDefined()
    expect(Swift.ArrangementView.Detail).toBeDefined()
  })

  it('exposes adaptive hooks and functions', async () => {
    expect(typeof useSizeClass).toBe('function')
    expect(typeof getSizeClass).toBe('function')
    expect(typeof useHinge).toBe('function')
    expect(typeof getHinge).toBe('function')
    expect(typeof onHingeChange).toBe('function')

    const sizeClass = await getSizeClass()
    expect(sizeClass).toHaveProperty('horizontal')
    expect(sizeClass).toHaveProperty('vertical')

    const hinge = await getHinge()
    expect(hinge === null || typeof hinge === 'object').toBe(true)
  })
})
