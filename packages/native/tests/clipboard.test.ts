import { afterEach, describe, expect, it, vi } from 'vitest'
import { getStringAsync, hasStringAsync, setStringAsync } from '../src/clipboard/index'

afterEach(() => {
  vi.unstubAllGlobals()
})

function stubClipboard(overrides: Record<string, unknown> = {}) {
  let stored = ''
  const clipboard = {
    readText: async () => stored,
    writeText: async (text: string) => {
      stored = text
    },
    ...overrides,
  }
  vi.stubGlobal('navigator', { clipboard })
  return {
    get stored() {
      return stored
    },
  }
}

describe('clipboard web', () => {
  it('round-trips a string through navigator.clipboard', async () => {
    stubClipboard()
    expect(await setStringAsync('hello')).toBe(true)
    expect(await getStringAsync()).toBe('hello')
    expect(await hasStringAsync()).toBe(true)
  })

  it('reports no string for an empty clipboard', async () => {
    stubClipboard()
    expect(await getStringAsync()).toBe('')
    expect(await hasStringAsync()).toBe(false)
  })

  it('degrades to empty and false without a clipboard api', async () => {
    vi.stubGlobal('navigator', {})
    expect(await getStringAsync()).toBe('')
    expect(await setStringAsync('hello')).toBe(false)
    expect(await hasStringAsync()).toBe(false)
  })

  it('resolves empty and false when the browser denies access', async () => {
    stubClipboard({
      readText: async () => {
        throw new Error('denied')
      },
      writeText: async () => {
        throw new Error('denied')
      },
    })
    expect(await getStringAsync()).toBe('')
    expect(await setStringAsync('hello')).toBe(false)
    expect(await hasStringAsync()).toBe(false)
  })
})
