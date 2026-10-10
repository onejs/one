import { act, create } from 'react-test-renderer'
import { describe, expect, it, vi } from 'vitest'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

import { useNativeState } from '../src/platform/syncNativeState'
import { TextInput } from '../src/platform/universal/TextInput/index'
import type { TextInputRef } from '../src/platform/universal/TextInput/textInputTypes'

type InputProps = {
  value: string
  onChange: (event: { currentTarget: { value: string } }) => void
}

function inputProps(tree: ReturnType<typeof create>): InputProps {
  return tree.root.findByType('input' as never).props as InputProps
}

// consumer-perspective tests for the web input: uncontrolled default,
// controlled handle convergence, and the imperative ref.
describe('universal TextInput on web', () => {
  it('renders the default value uncontrolled', () => {
    let tree!: ReturnType<typeof create>
    act(() => {
      tree = create(<TextInput defaultValue="hello" />)
    })
    expect(inputProps(tree).value).toBe('hello')
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
    expect(inputProps(tree).value).toBe('one')
    act(() => {
      handle.set('two')
    })
    expect(inputProps(tree).value).toBe('two')
  })

  it('writes keystrokes into the handle and notifies', () => {
    const onChangeText = vi.fn()
    let tree!: ReturnType<typeof create>
    act(() => {
      tree = create(<TextInput defaultValue="a" onChangeText={onChangeText} />)
    })
    expect(inputProps(tree).value).toBe('a')
    act(() => {
      inputProps(tree).onChange({ currentTarget: { value: 'ab' } })
    })
    expect(onChangeText).toHaveBeenCalledWith('ab')
    expect(inputProps(tree).value).toBe('ab')
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
    expect(inputProps(tree).value).toBe('')
    await expect(ref!.setSelection(0, 1)).resolves.toBeUndefined()
  })
})
