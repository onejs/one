import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'
import type { ImageProps } from './generated/controlTypes'
import type { SFSymbolName } from './generated/sfSymbolNames'

type Expect<T extends true> = T
type _known = Expect<'star.fill' extends SFSymbolName ? true : false>
type _unknown = Expect<'not-a-symbol' extends SFSymbolName ? false : true>
type _image = Expect<'star.fill' extends NonNullable<ImageProps['systemName']> ? true : false>

describe('SFSymbolName', () => {
  test('the committed catalog is a sorted unique union that includes current names', () => {
    const text = readFileSync(join(import.meta.dirname, 'generated/sfSymbolNames.ts'), 'utf8')
    const names = [...text.matchAll(/^  \| '([^']+)'$/gm)].map((match) => match[1])
    expect(names.length).toBeGreaterThan(9000)
    expect(names).toEqual([...names].sort())
    expect(new Set(names).size).toBe(names.length)
    expect(names).toContain('star.fill')
    expect(names).toContain('shippingbox.fill')
    expect(names).toContain('digitalcrown')
    expect(names).toContain('air.conditioner')
    expect(names).not.toContain('not-a-symbol')
  })
})
