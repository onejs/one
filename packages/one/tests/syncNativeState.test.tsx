import { useEffect } from 'react'
import { act, create } from 'react-test-renderer'
import { describe, expect, it } from 'vitest'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

import { isSyncState } from '../src/platform/syncStore'
import { useNativeState, type NativeState } from '../src/platform/syncNativeState'

// consumer-perspective tests: render the hook the way an app would and assert
// the Expo useNativeState contract (value/get/set/onChange, one handle shared
// across views, writes visible before React commits).
describe('useNativeState', () => {
  it('exposes the Expo surface: value, get, set, onChange', () => {
    let handle!: NativeState<string>
    function Reader() {
      handle = useNativeState('initial')
      return null
    }
    act(() => {
      create(<Reader />)
    })
    expect(handle.value).toBe('initial')
    expect(handle.get()).toBe('initial')
    expect(typeof handle.set).toBe('function')
    expect(handle.onChange).toBeNull()
    expect(isSyncState(handle)).toBe(true)
  })

  it('captures the initial value once', () => {
    const handles: NativeState<string>[] = []
    function Reader({ initial }: { initial: string }) {
      handles.push(useNativeState(initial))
      return null
    }
    let root: ReturnType<typeof create>
    act(() => {
      root = create(<Reader initial="first" />)
    })
    act(() => {
      root.update(<Reader initial="second" />)
    })
    expect(handles).toHaveLength(2)
    expect(handles[0]).toBe(handles[1])
    expect(handles[1].value).toBe('first')
  })

  it('keeps .value reads in render live across writes', () => {
    let handle!: NativeState<string>
    const rendered: string[] = []
    function Reader() {
      handle = useNativeState('')
      rendered.push(handle.value)
      return null
    }
    act(() => {
      create(<Reader />)
    })
    act(() => {
      handle.set('a')
    })
    act(() => {
      handle.value = 'b'
    })
    expect(rendered).toEqual(['', 'a', 'b'])
  })

  it('shares one handle across views so every bound view converges', () => {
    const renderedA: string[] = []
    const renderedB: string[] = []
    function ViewA({ state }: { state: NativeState<string> }) {
      renderedA.push(state.value)
      return null
    }
    // ViewB reads through its own subscription-free render: the parent owns the
    // hook and both children read the same handle.
    let handle!: NativeState<string>
    function Parent() {
      handle = useNativeState('shared')
      renderedB.push(handle.value)
      return <ViewA state={handle} />
    }
    act(() => {
      create(<Parent />)
    })
    // the value is readable synchronously, before React commits the
    // re-render, and both views converge without any prop drilling.
    act(() => {
      handle.set('updated')
      expect(handle.get()).toBe('updated')
    })
    act(() => {
      handle.set('updated-again')
    })
    expect(renderedA.at(-1)).toBe('updated-again')
    expect(renderedB.at(-1)).toBe('updated-again')
  })

  it('supports the Expo onChange-in-effect pattern', () => {
    const seen: string[] = []
    let handle!: NativeState<string>
    function Writer() {
      handle = useNativeState('a')
      useEffect(() => {
        handle.onChange = (value) => {
          seen.push(value)
        }
        return () => {
          handle.onChange = null
        }
      }, [])
      return null
    }
    let root: ReturnType<typeof create>
    act(() => {
      root = create(<Writer />)
    })
    act(() => {
      handle.set('b')
    })
    expect(seen).toEqual(['b'])
    act(() => {
      root.unmount()
    })
    expect(handle.onChange).toBeNull()
  })
})
