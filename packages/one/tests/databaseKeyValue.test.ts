import { DatabaseSync } from 'node:sqlite'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const { openMock } = vi.hoisted(() => ({ openMock: vi.fn() }))

vi.mock('@op-engineering/op-sqlite', () => ({
  open: openMock,
  openAsync: vi.fn(),
}))

import { openKeyValue as openKeyValueOnWeb } from '../src/platform/database/keyValue'
import { Database as WebDatabase } from '../src/platform/database/index'

class MemoryStorage {
  #map = new Map<string, string>()
  get length(): number {
    return this.#map.size
  }
  key(index: number): string | null {
    return [...this.#map.keys()][index] ?? null
  }
  getItem(key: string): string | null {
    return this.#map.has(key) ? this.#map.get(key)! : null
  }
  setItem(key: string, value: string): void {
    this.#map.set(key, String(value))
  }
  removeItem(key: string): void {
    this.#map.delete(key)
  }
  clear(): void {
    this.#map.clear()
  }
}

// node:sqlite stands in for op-sqlite so the native statements run against
// sqlite itself. one file per database name, matching a reopened store.
function installSqliteOpen(directory: string) {
  const files = new Map<string, string>()
  openMock.mockImplementation(({ name }: { name: string }) => {
    const path = files.get(name) ?? join(directory, name)
    files.set(name, path)
    const db = new DatabaseSync(path)
    return {
      executeSync(sql: string, params: unknown[] = []) {
        const statement = db.prepare(sql)
        if (/^\s*SELECT\b/i.test(sql)) {
          return { rows: statement.all(...(params as never[])), rowsAffected: 0 }
        }
        const result = statement.run(...(params as never[]))
        return { rows: [], rowsAffected: result.changes }
      },
      close() {
        db.close()
      },
    }
  })
}

beforeEach(() => {
  vi.stubGlobal('localStorage', new MemoryStorage())
  openMock.mockReset()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
})

describe('web key-value store', () => {
  it('round-trips strings and keeps names apart', () => {
    const notes = openKeyValueOnWeb({ name: 'notes' })
    const other = openKeyValueOnWeb({ name: 'notes.draft' })
    expect(notes.getItem('title')).toBeNull()
    notes.setItem('title', 'hello')
    notes.setItem('empty', '')
    other.setItem('title', 'elsewhere')
    localStorage.setItem('page-key', 'untouched')
    expect(notes.getItem('title')).toBe('hello')
    expect(notes.getItem('empty')).toBe('')
    expect(notes.getAllKeys()).toEqual(['empty', 'title'])
    expect(other.getItem('title')).toBe('elsewhere')
    notes.removeItem('empty')
    expect(notes.getAllKeys()).toEqual(['title'])
    notes.clear()
    expect(notes.getItem('title')).toBeNull()
    expect(other.getItem('title')).toBe('elsewhere')
    expect(localStorage.getItem('page-key')).toBe('untouched')
  })

  it('reads a name again after close', () => {
    const first = openKeyValueOnWeb({ name: 'session' })
    first.setItem('token', 'abc')
    first.close()
    expect(() => first.getItem('token')).toThrow(/closed/)
    const second = openKeyValueOnWeb({ name: 'session' })
    expect(second.getItem('token')).toBe('abc')
    second.close()
  })

  it('rejects bad names, keys, and values before writing', () => {
    expect(() => openKeyValueOnWeb({ name: '' })).toThrow(/name must be/)
    expect(() => openKeyValueOnWeb({ name: 'a/b' })).toThrow(/name must be/)
    expect(() => openKeyValueOnWeb({ name: '../outside' })).toThrow(/name must be/)
    const store = openKeyValueOnWeb({ name: 'ok' })
    expect(() => store.getItem('')).toThrow(/key must be a non-empty string/)
    expect(() => store.setItem('k', 1 as never)).toThrow(/value must be a string/)
    expect(store.getAllKeys()).toEqual([])
    expect(() => WebDatabase.open({ name: 'app.sqlite' })).toThrow(/iOS or Android/)
  })
})

describe('native key-value store', () => {
  let directory: string

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), 'one-kv-'))
    installSqliteOpen(directory)
  })

  afterEach(() => {
    rmSync(directory, { recursive: true, force: true })
  })

  async function openNative() {
    const native = await import('../src/platform/database/keyValue.native')
    return native.openKeyValue
  }

  it('persists across connections and overwrites one key', async () => {
    const openKeyValue = await openNative()
    const first = openKeyValue({ name: 'contrast-dev-update' })
    first.setItem('reloadTarget', 'update-1')
    first.setItem('reloadTarget', 'update-2')
    first.setItem('other', 'keep')
    expect(first.getAllKeys()).toEqual(['other', 'reloadTarget'])
    first.close()
    const second = openKeyValue({ name: 'contrast-dev-update' })
    expect(second.getItem('reloadTarget')).toBe('update-2')
    second.removeItem('other')
    expect(second.getItem('other')).toBeNull()
    second.clear()
    expect(second.getAllKeys()).toEqual([])
    expect(() => second.setItem('reloadTarget', 'again')).not.toThrow()
    second.close()
    expect(() => second.getItem('reloadTarget')).toThrow(/closed/)
    expect(openMock).toHaveBeenCalledWith({ name: 'one-kv-contrast-dev-update.sqlite' })
  })

  it('does not open sqlite for a rejected name', async () => {
    const openKeyValue = await openNative()
    expect(() => openKeyValue({ name: 'has space' })).toThrow(/name must be/)
    expect(openMock).not.toHaveBeenCalled()
  })
})
