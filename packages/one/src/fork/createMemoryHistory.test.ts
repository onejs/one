import { afterEach, beforeEach, expect, test } from 'vitest'

import { createMemoryHistory } from './createMemoryHistory'

// Minimal window mock to exercise createMemoryHistory without jsdom.
// The module reads `window.history.state`, calls `pushState`/`replaceState`,
// listens for `popstate`, reads `location.hash`, and touches `window.document.title`.
type Entry = { state: any; path: string }

type DomMock = {
  firePopState: (delta: number) => void
  entries: Entry[]
  getCursor: () => number
}

let dom: DomMock

function setupDomMock(initialPath = '/'): DomMock {
  const entries: Entry[] = [{ state: null, path: initialPath }]
  let cursor = 0
  const listeners: Array<(ev: any) => void> = []

  const mockHistory: any = {
    get state() {
      return entries[cursor].state
    },
    pushState(state: any, _title: string, url: string) {
      entries.length = cursor + 1
      entries.push({ state, path: url })
      cursor = entries.length - 1
    },
    replaceState(state: any, _title: string, url: string) {
      entries[cursor] = { state, path: url }
    },
    go() {
      // not exercised in these tests; the real code path triggers popstate via
      // a fake event instead
    },
    get length() {
      return entries.length
    },
  }

  const mockLocation: any = {
    get pathname() {
      const p = entries[cursor].path
      return p.split('?')[0].split('#')[0]
    },
    get search() {
      const p = entries[cursor].path
      const q = p.indexOf('?')
      if (q === -1) return ''
      return p.slice(q).split('#')[0]
    },
    get hash() {
      const p = entries[cursor].path
      const h = p.indexOf('#')
      return h === -1 ? '' : p.slice(h)
    },
  }

  const mockDocument: any = { title: '' }

  const mockWindow: any = {
    history: mockHistory,
    location: mockLocation,
    document: mockDocument,
    addEventListener(type: string, handler: any) {
      if (type === 'popstate') listeners.push(handler)
    },
    removeEventListener(type: string, handler: any) {
      if (type === 'popstate') {
        const i = listeners.indexOf(handler)
        if (i > -1) listeners.splice(i, 1)
      }
    },
  }

  ;(globalThis as any).window = mockWindow
  ;(globalThis as any).location = mockLocation
  ;(globalThis as any).document = mockDocument

  return {
    entries,
    getCursor: () => cursor,
    firePopState: (delta: number) => {
      const next = cursor + delta
      if (next < 0 || next >= entries.length) return
      cursor = next
      for (const l of listeners.slice()) l({ state: entries[cursor].state })
    },
  }
}

function teardownDomMock() {
  delete (globalThis as any).window
  delete (globalThis as any).location
  delete (globalThis as any).document
}

// Minimal NavigationState-shaped objects. createMemoryHistory treats `state`
// opaquely — it only stores it on HistoryRecord.state — so we just need stable
// object identity to prove the correct record is returned.
const stackState = (routeNames: string[], index: number) =>
  ({
    key: 'stack-root',
    index,
    routeNames,
    routes: routeNames.map((name) => ({ key: `${name}-k`, name })),
    stale: false,
    type: 'stack',
  }) as any

beforeEach(() => {
  dom = setupDomMock()
})
afterEach(() => {
  teardownDomMock()
})

test('browser back then forward restores the pushed stack (regression for external-popstate index drift)', () => {
  const history = createMemoryHistory()

  // Step 0: initial load at '/', state = [index]
  const s0 = stackState(['index'], 0)
  history.replace({ path: '/', state: s0 })
  expect(history.index).toBe(0)

  // Step 1: router.push('/todo/abc'), state = [index, todo]
  const s1 = stackState(['index', 'todo'], 1)
  history.push({ path: '/todo/abc', state: s1 })
  expect(history.index).toBe(1)
  expect(history.get(1)?.state).toBe(s1)

  // Step 2: simulate the runtime sequence on browser back:
  //  a) popstate fires externally
  //  b) useLinking's listen callback reads history.index + history.get(index),
  //     then does navigation.resetRoot(record.state). That triggers
  //     onStateChange, which (because path === pendingPath) calls
  //     history.replace({path:'/', state: s0}).
  //
  // The bug: createMemoryHistory's closure `index` is NOT updated by external
  // popstate, so history.replace writes to items[staleIndex] — overwriting
  // the '/todo/abc' record we just navigated away from.
  const popStateLog: Array<{ path: string; recordPath?: string; recordState: any }> =
    []
  const unlisten = history.listen(() => {
    const idx = history.index
    const rec = history.get(idx)
    popStateLog.push({
      path: (globalThis as any).window.location.pathname,
      recordPath: rec?.path,
      recordState: rec?.state,
    })
    // emulate useLinking's post-resetRoot replace (same path, same state)
    history.replace({ path: '/', state: s0 })
  })

  dom.firePopState(-1) // browser back

  // Listener saw the correct stored record for '/'
  expect(popStateLog).toHaveLength(1)
  expect(popStateLog[0].recordPath).toBe('/')
  expect(popStateLog[0].recordState).toBe(s0)

  // Step 3: browser forward. The critical assertion: the '/todo/abc' record
  // should still be intact with the full state s1.
  dom.firePopState(1)

  expect(popStateLog).toHaveLength(2)
  expect(popStateLog[1].recordPath).toBe('/todo/abc')
  // This is the line that fails without the fix: record.state would have been
  // overwritten to s0 during step 2's stale-index history.replace, or the id
  // lookup would miss entirely and return items[0].
  expect(popStateLog[1].recordState).toBe(s1)
  expect(history.index).toBe(1)

  unlisten()
})
