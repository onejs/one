import { createElement, forwardRef, useImperativeHandle } from 'react'
import { act, create } from 'react-test-renderer'
import { describe, expect, it, vi } from 'vitest'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

// stub the RN TextInput: react-native-web needs a DOM, and these tests pin
// our wiring (value mapping, handle writes, ref shape), not RN-web itself.
vi.mock('react-native', () => ({
  StyleSheet: { create: (styles: unknown) => styles },
  TextInput: forwardRef((props: Record<string, unknown>, ref) => {
    useImperativeHandle(ref, () => ({
      focus: () => {},
      blur: () => {},
      isFocused: () => false,
      setSelection: () => {},
    }))
    return createElement('one-text-input', props)
  }),
}))

import { useNativeState } from '../src/syncNativeState'
import { TextInput } from '../src/universal/TextInput/index'
import type { TextInputRef } from '../src/universal/TextInput/textInputTypes'

type StubProps = {
  value: string
  onChangeText: (text: string) => void
}

function stubProps(tree: ReturnType<typeof create>): StubProps {
  return tree.root.findByType('one-text-input' as never).props as StubProps
}

// consumer-perspective tests for the web input: uncontrolled default,
// controlled handle convergence, and the imperative ref.
describe('universal TextInput on web', () => {
  it('renders the default value uncontrolled', () => {
    let tree!: ReturnType<typeof create>
    act(() => {
      tree = create(<TextInput defaultValue="hello" />)
    })
    expect(stubProps(tree).value).toBe('hello')
  })

  it('converges a controlled handle written outside React', () => {
    let handle!: { set(value: string): void }
    function Reader() {
      const state = useNativeState('one')
      handle = state
      return <TextInput value={state} />
    }
    let tree!: ReturnType<typeof create>
    act(() => {
      tree = create(<Reader />)
    })
    expect(stubProps(tree).value).toBe('one')
    act(() => {
      handle.set('two')
    })
    expect(stubProps(tree).value).toBe('two')
  })

  it('writes keystrokes into the handle and notifies', () => {
    const onChangeText = vi.fn()
    let tree!: ReturnType<typeof create>
    act(() => {
      tree = create(<TextInput defaultValue="a" onChangeText={onChangeText} />)
    })
    expect(stubProps(tree).value).toBe('a')
    act(() => {
      stubProps(tree).onChangeText('ab')
    })
    expect(onChangeText).toHaveBeenCalledWith('ab')
    expect(stubProps(tree).value).toBe('ab')
  })

  it('exposes the imperative ref', async () => {
    let ref: TextInputRef | null = null
    let tree!: ReturnType<typeof create>
    act(() => {
      tree = create(
        <TextInput
          defaultValue="clear me"
          ref={(handle) => {
            ref = handle
          }}
        />
      )
    })
    expect(ref).not.toBeNull()
    expect(typeof ref!.focus).toBe('function')
    expect(typeof ref!.blur).toBe('function')
    expect(typeof ref!.clear).toBe('function')
    expect(typeof ref!.isFocused).toBe('function')
    expect(typeof ref!.setSelection).toBe('function')
    ref!.focus()
    ref!.blur()
    expect(ref!.isFocused()).toBe(false)
    act(() => {
      ref!.clear()
    })
    expect(stubProps(tree).value).toBe('')
    await expect(ref!.setSelection(0, 1)).resolves.toBeUndefined()
  })
})
