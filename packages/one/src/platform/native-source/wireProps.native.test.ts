import { describe, expect, it } from 'vitest'
import { nextDocument } from './wireProps.native'

const rows = (n: number) => Array.from({ length: n }, (_, i) => ({ id: i }))

describe('nextDocument', () => {
  it('sends every prop first, with a seq', () => {
    const doc = nextDocument({ title: 'a', rows: rows(3), onTap: () => {} }, undefined, null, false)!
    expect(JSON.parse(doc.text)).toEqual({ $seq: 1, title: 'a', rows: [{ id: 0 }, { id: 1 }, { id: 2 }], onTap: true })
  })

  it('sends only changed props, based on the last seq', () => {
    const first = nextDocument({ title: 'a', count: 1 }, undefined, null, false)!
    expect(nextDocument({ title: 'a', count: 1 }, undefined, first, false)).toBeNull()
    const second = nextDocument({ title: 'b', count: 1 }, undefined, first, false)!
    expect(JSON.parse(second.text)).toEqual({ $seq: 2, $base: 1, title: 'b' })
  })

  it('sends null for a removed prop', () => {
    const first = nextDocument({ title: 'a', count: 1 }, undefined, null, false)!
    const second = nextDocument({ title: 'a' }, undefined, first, false)!
    expect(JSON.parse(second.text)).toEqual({ $seq: 2, $base: 1, count: null })
  })

  it('sends a long array as indexed changes by element identity', () => {
    const list = rows(100)
    const first = nextDocument({ rows: list }, undefined, null, false)!
    const next = list.slice()
    next[5] = { id: 500 }
    next.push({ id: 100 })
    const second = nextDocument({ rows: next }, undefined, first, false)!
    expect(JSON.parse(second.text)).toEqual({
      $seq: 2,
      $base: 1,
      $lists: { rows: { length: 101, set: [[5, { id: 500 }], [100, { id: 100 }]] } },
    })
  })

  it('sends a shrunk array as a length', () => {
    const list = rows(100)
    const first = nextDocument({ rows: list }, undefined, null, false)!
    const second = nextDocument({ rows: list.slice(0, 90) }, undefined, first, false)!
    expect(JSON.parse(second.text).$lists).toEqual({ rows: { length: 90, set: [] } })
  })

  it('sends the whole array when half of it changed', () => {
    const first = nextDocument({ rows: rows(100) }, undefined, null, false)!
    const second = nextDocument({ rows: rows(100) }, undefined, first, false)!
    expect(JSON.parse(second.text).rows).toHaveLength(100)
  })

  it('sends everything again when asked', () => {
    const first = nextDocument({ title: 'a' }, undefined, null, false)!
    const second = nextDocument({ title: 'a' }, undefined, first, true)!
    expect(JSON.parse(second.text)).toEqual({ $seq: 2, title: 'a' })
  })
})
