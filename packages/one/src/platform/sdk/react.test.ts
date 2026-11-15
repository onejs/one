import { createElement } from 'react'
import { act, create } from 'react-test-renderer'
import { SDKHandle, decodeSDKResult, registerSDKClass, setSDKNative, type SDKNative, type OneSDKHandle } from './wire'
import { useSDKProperty } from './react'

vi.mock('react', async () => {
  const { createRequire } = await import('node:module')
  const require = createRequire(import.meta.url)
  return require(createRequire(require.resolve('react-test-renderer')).resolve('react'))
})

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

describe('SDK hook native identity', () => {
  it('keeps one subscription across fresh singleton handles and tears down on unmount', async () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
    class Singleton extends SDKHandle {
      readonly thermalState!: number
      declare readonly $observable: { thermalState: true }
    }
    registerSDKClass('Hook.Singleton', Singleton, { module: 'Hook', properties: { thermalState: 1 } })
    let renders = 0
    const cancel = vi.fn()
    let send!: (result: any) => void
    const observe = vi.fn((_module, _id, _data, _handles, listener) => {
      send = listener
      listener({ data: { value: 7 }, handles: [] })
      return cancel
    })
    setSDKNative({ observe } as unknown as SDKNative)
    function Component() {
      // the SDK creates a new hybrid handle for every singleton getter result.
      const object = decodeSDKResult<Singleton>({
        data: { value: { $h: 0, $id: 'singleton-hook', $t: 'Hook.Singleton' } },
        handles: [{ typeName: 'Hook.Singleton' } as OneSDKHandle],
      })
      const state = useSDKProperty(object, 'thermalState')
      if (++renders > 10) throw new Error('singleton subscription loop')
      return createElement('value', null, `${state.status}:${state.value}`)
    }
    let root!: ReturnType<typeof create>
    await act(async () => { root = create(createElement(Component)) })
    expect(root.toJSON()).toMatchObject({ children: ['value:7'] })
    await act(async () => { root.update(createElement(Component)) })
    await act(async () => { send({ data: { value: 8 }, handles: [] }) })
    expect(root.toJSON()).toMatchObject({ children: ['value:8'] })
    expect(observe).toHaveBeenCalledOnce()
    expect(cancel).not.toHaveBeenCalled()
    await act(async () => { root.unmount() })
    expect(cancel).toHaveBeenCalledOnce()
  })
})
