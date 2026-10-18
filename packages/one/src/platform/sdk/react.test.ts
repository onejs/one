import { describe, expect, it, vi } from 'vitest'
import { createSDKStore } from './react'

describe('SDK React subscription lifetime', () => {
  it('starts at subscription, caches snapshots, and releases the last subscriber', () => {
    let send!: (value: number) => void
    const stop = vi.fn()
    const start = vi.fn((value: (value: number) => void) => { send = value; return stop })
    const store = createSDKStore(start)
    expect(start).not.toHaveBeenCalled()
    const snapshot = store.getSnapshot()
    expect(store.getSnapshot()).toBe(snapshot)
    const first = vi.fn()
    const second = vi.fn()
    const removeFirst = store.subscribe(first)
    const removeSecond = store.subscribe(second)
    expect(start).toHaveBeenCalledOnce()
    send(17)
    expect(store.getSnapshot()).toEqual({ status: 'value', value: 17, error: undefined })
    expect(first).toHaveBeenCalledOnce()
    expect(second).toHaveBeenCalledOnce()
    removeFirst()
    expect(stop).not.toHaveBeenCalled()
    removeSecond()
    expect(stop).toHaveBeenCalledOnce()
    send(99)
    expect(store.getSnapshot().value).toBe(17)
  })

  it('rejects old callbacks after React remounts a subscription', () => {
    const sends: ((value: number) => void)[] = []
    const store = createSDKStore<number>((value) => { sends.push(value); return () => {} })
    store.subscribe(() => {})()
    const remove = store.subscribe(() => {})
    sends[1](2)
    sends[0](1)
    expect(store.getSnapshot().value).toBe(2)
    remove()
  })

  it('reports synchronous installation errors and native errors with the last value', () => {
    const broken = createSDKStore(() => { throw new Error('not observable') })
    const removeBroken = broken.subscribe(() => {})
    expect(broken.getSnapshot().error?.message).toBe('not observable')
    removeBroken()
    const store = createSDKStore<number>((value, error) => {
      value(3)
      error(new Error('publisher failed'))
      return () => {}
    })
    const remove = store.subscribe(() => {})
    expect(store.getSnapshot()).toMatchObject({ status: 'error', value: 3 })
    expect(store.getSnapshot().error?.message).toBe('publisher failed')
    remove()
  })
})
