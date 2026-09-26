import { describe, expect, it } from 'vitest'
import { segmentsFor } from '../src/platform/adaptive/reservedRegionsContext'
import type { ReservedRegion } from '../src/platform/adaptive/types'

const division: ReservedRegion = {
  id: 'fold',
  kind: 'division',
  frame: { x: 48, y: 0, width: 4, height: 80 },
  margins: { top: 0, left: 0, bottom: 0, right: 0 },
  isActive: true,
}

describe('reserved-region window segments', () => {
  it('keeps an unspanned or partly crossing window as one segment', () => {
    const bounds = { width: 100, height: 80 }
    expect(segmentsFor(bounds, [])).toEqual([{ x: 0, y: 0, ...bounds }])
    expect(segmentsFor(bounds, [{ ...division, isActive: false }])).toEqual([
      { x: 0, y: 0, ...bounds },
    ])
    expect(segmentsFor(bounds, [{ ...division, frame: { ...division.frame, height: 40 } }])).toEqual([
      { x: 0, y: 0, ...bounds },
    ])
    expect(segmentsFor(bounds, [{ ...division, kind: 'occlusion' }])).toEqual([
      { x: 0, y: 0, ...bounds },
    ])
  })

  it('separates a window across a vertical or horizontal fold', () => {
    const bounds = { width: 100, height: 80 }
    expect(segmentsFor(bounds, [division])).toEqual([
      { x: 0, y: 0, width: 48, height: 80 },
      { x: 52, y: 0, width: 48, height: 80 },
    ])
    expect(segmentsFor(bounds, [{ ...division, frame: { x: 0, y: 38, width: 100, height: 4 } }])).toEqual([
      { x: 0, y: 0, width: 100, height: 38 },
      { x: 0, y: 42, width: 100, height: 38 },
    ])
    expect(segmentsFor({ width: 734, height: 100 }, [{
      ...division,
      frame: { x: -22.799999237, y: 48, width: 756.799987793, height: 4 },
    }])).toEqual([
      { x: 0, y: 0, width: 734, height: 48 },
      { x: 0, y: 52, width: 734, height: 48 },
    ])
  })
})
