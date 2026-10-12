import { act, create } from 'react-test-renderer'
import { describe, expect, it, vi } from 'vitest'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

vi.mock('react-native-nitro-modules', () => ({
  NitroModules: { createHybridObject: vi.fn() },
}))

type Pending = { resolve: () => void; reject: (error: Error) => void }

// a native hybrid whose prevent/allow settle only when the test says so, so
// callers can overlap a single in-flight arm or release.
function deferredNative() {
  const pending: { kind: 'prevent' | 'allow'; call: Pending }[] = []
  const hybrid = {
    prevented: false,
    calls: { prevent: 0, allow: 0 },
    prevent: () => {
      hybrid.calls.prevent++
      return new Promise<void>((resolve, reject) => {
        pending.push({
          kind: 'prevent',
          call: {
            resolve: () => {
              hybrid.prevented = true
              resolve()
            },
            reject,
          },
        })
      })
    },
    allow: () => {
      hybrid.calls.allow++
      return new Promise<void>((resolve, reject) => {
        pending.push({
          kind: 'allow',
          call: {
            resolve: () => {
              hybrid.prevented = false
              resolve()
            },
            reject,
          },
        })
      })
    },
    isPrevented: () => Promise.resolve(hybrid.prevented),
    // settle the oldest native call after earlier queued work has started it
    async settle(kind: 'prevent' | 'allow', error?: Error) {
      await flush()
      const next = pending.shift()
      if (!next || next.kind !== kind)
        throw new Error(
          `expected a pending native ${kind}, found ${next?.kind ?? 'none'}`
        )
      if (error) next.call.reject(error)
      else next.call.resolve()
      await flush()
    },
    get pendingCount() {
      return pending.length
    },
  }
  return hybrid
}

async function flush() {
  for (let i = 0; i < 10; i++) await Promise.resolve()
}

async function load() {
  vi.resetModules()
  const hybrid = deferredNative()
  const { NitroModules } = await import('react-native-nitro-modules')
  vi.mocked(NitroModules.createHybridObject).mockReturnValue(hybrid as never)
  const module = await import('../src/platform/screen-capture/index.native')
  return { ...module, hybrid }
}

function track(promise: Promise<void>) {
  const state = {
    settled: 'pending' as 'pending' | 'resolved' | 'rejected',
    error: undefined as unknown,
  }
  promise.then(
    () => {
      state.settled = 'resolved'
    },
    (error: unknown) => {
      state.settled = 'rejected'
      state.error = error
    }
  )
  return state
}

const sceneError = () =>
  new Error('E_SCREEN_CAPTURE_SCENE: ScreenCapture.prevent: no active window scene')

describe('ScreenCapture prevention holds', () => {
  it('a second key waits for the in-flight arm instead of resolving unprotected', async () => {
    const { ScreenCapture, hybrid } = await load()
    const a = track(ScreenCapture.prevent('a'))
    const b = track(ScreenCapture.prevent('b'))
    await flush()
    expect(b.settled).toBe('pending')
    await hybrid.settle('prevent')
    expect([a.settled, b.settled]).toEqual(['resolved', 'resolved'])
    expect(await ScreenCapture.isPrevented()).toBe(true)
    expect(hybrid.calls.prevent).toBe(1)
  })

  it('a duplicate pending key shares the in-flight arm', async () => {
    const { ScreenCapture, hybrid } = await load()
    const first = track(ScreenCapture.prevent('a'))
    const second = track(ScreenCapture.prevent('a'))
    await flush()
    expect(second.settled).toBe('pending')
    await hybrid.settle('prevent')
    expect([first.settled, second.settled]).toEqual(['resolved', 'resolved'])
    expect(hybrid.calls.prevent).toBe(1)
  })

  it('a failed arm rejects every waiter and a later prevent arms again', async () => {
    const { ScreenCapture, hybrid } = await load()
    const a = track(ScreenCapture.prevent('a'))
    const b = track(ScreenCapture.prevent('b'))
    await hybrid.settle('prevent', sceneError())
    expect([a.settled, b.settled]).toEqual(['rejected', 'rejected'])
    expect((a.error as { code?: string }).code).toBe('E_SCREEN_CAPTURE_SCENE')
    expect((b.error as { code?: string }).code).toBe('E_SCREEN_CAPTURE_SCENE')

    const retryB = track(ScreenCapture.prevent('b'))
    const retryC = track(ScreenCapture.prevent('c'))
    await flush()
    expect(hybrid.calls.prevent).toBe(2)
    expect([retryB.settled, retryC.settled]).toEqual(['pending', 'pending'])
    await hybrid.settle('prevent')
    expect([retryB.settled, retryC.settled]).toEqual(['resolved', 'resolved'])
    expect(await ScreenCapture.isPrevented()).toBe(true)

    // the failed key 'a' holds nothing, so releasing the retried keys disarms
    await ScreenCapture.allow('b')
    const released = track(ScreenCapture.allow('c'))
    await hybrid.settle('allow')
    expect(released.settled).toBe('resolved')
    expect(await ScreenCapture.isPrevented()).toBe(false)
  })

  it('overlapping keys release native only after the last allow', async () => {
    const { ScreenCapture, hybrid } = await load()
    const a = track(ScreenCapture.prevent('a'))
    await hybrid.settle('prevent')
    expect(a.settled).toBe('resolved')
    await ScreenCapture.prevent('b')
    await ScreenCapture.allow('a')
    expect(hybrid.calls.allow).toBe(0)
    expect(await ScreenCapture.isPrevented()).toBe(true)
    const released = track(ScreenCapture.allow('b'))
    await hybrid.settle('allow')
    expect(released.settled).toBe('resolved')
    expect(await ScreenCapture.isPrevented()).toBe(false)
  })

  it('allow during a pending arm releases after the arm lands', async () => {
    const { ScreenCapture, hybrid } = await load()
    const a = track(ScreenCapture.prevent('a'))
    await flush()
    const released = track(ScreenCapture.allow('a'))
    await hybrid.settle('prevent')
    expect(a.settled).toBe('resolved')
    expect(released.settled).toBe('pending')
    await hybrid.settle('allow')
    expect(released.settled).toBe('resolved')
    expect(await ScreenCapture.isPrevented()).toBe(false)
    expect(hybrid.pendingCount).toBe(0)
  })

  it('prevent during a pending release arms again after it', async () => {
    const { ScreenCapture, hybrid } = await load()
    const a = track(ScreenCapture.prevent('a'))
    await hybrid.settle('prevent')
    expect(a.settled).toBe('resolved')
    const released = track(ScreenCapture.allow('a'))
    await flush()
    const b = track(ScreenCapture.prevent('b'))
    await hybrid.settle('allow')
    expect(released.settled).toBe('resolved')
    expect(b.settled).toBe('pending')
    await hybrid.settle('prevent')
    expect(b.settled).toBe('resolved')
    expect(await ScreenCapture.isPrevented()).toBe(true)
  })

  it('usePreventScreenCapture holds while mounted alongside a manual hold', async () => {
    const { ScreenCapture, usePreventScreenCapture, hybrid } = await load()
    function Guard() {
      usePreventScreenCapture('screen')
      return null
    }
    let root!: ReturnType<typeof create>
    await act(async () => {
      root = create(<Guard />)
    })
    await hybrid.settle('prevent')
    expect(await ScreenCapture.isPrevented()).toBe(true)

    await ScreenCapture.prevent('manual')
    await act(async () => {
      root.unmount()
    })
    await flush()
    expect(hybrid.calls.allow).toBe(0)
    expect(await ScreenCapture.isPrevented()).toBe(true)

    const released = track(ScreenCapture.allow('manual'))
    await hybrid.settle('allow')
    expect(released.settled).toBe('resolved')
    expect(await ScreenCapture.isPrevented()).toBe(false)
  })
})
