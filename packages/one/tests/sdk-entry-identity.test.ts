import { describe, expect, it } from 'vitest'
import { assignEntryIds } from '../codegen/sdk/identity'
import type { Entry } from '../codegen/sdk/emit'

const entry = (key: string): Omit<Entry, 'swift'> => ({
  id: 0,
  key,
  usr: key,
  name: key,
  kind: 'function',
  main: false,
  isAsync: false,
  params: [],
  returns: { k: 'named', name: 'Int', args: [] },
})

describe('SDK dispatch compatibility', () => {
  it('keeps published calls on the same symbol after SDK pruning or additions', () => {
    const published = ['a', 'b', 'c', 'd'].map(entry)
    const native = ['c', 'new', 'a', 'd'].map(entry)
    assignEntryIds(published)
    assignEntryIds(native)
    const dispatch = new Map(native.map(({ id, key }) => [id, key]))
    expect(published.map(({ id }) => dispatch.get(id))).toEqual(['a', undefined, 'c', 'd'])
    for (const { id } of native) expect(Number.isSafeInteger(id)).toBe(true)
  })

  it('rejects a call whose argument representation or actor dispatch changed', () => {
    const published = entry('same-symbol')
    const changed = { ...published, main: true }
    assignEntryIds([published])
    assignEntryIds([changed])
    expect(changed.id).not.toBe(published.id)
    const changedReturn = { ...published, returns: { k: 'named' as const, name: 'String', args: [] } }
    assignEntryIds([changedReturn])
    expect(changedReturn.id).not.toBe(published.id)
  })

  it('keeps string-choice arguments compatible when an SDK adds choices', () => {
    const published = entry('key-path')
    published.params = [{
      name: 'path', label: 'path', optional: false, hasDefault: false,
      type: { k: 'named', name: 'String', args: [] }, keyPaths: ['old'],
    }]
    const native = { ...published, params: [{ ...published.params[0], keyPaths: ['old', 'new'] }] }
    assignEntryIds([published])
    assignEntryIds([native])
    expect(native.id).toBe(published.id)
  })

  it('refuses duplicate native dispatch identities instead of selecting a symbol', () => {
    expect(() => assignEntryIds([entry('duplicate'), entry('duplicate')])).toThrow(/duplicate.*dispatch/)
  })
})
