import { readFileSync } from 'node:fs'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { act, create } from 'react-test-renderer'
import { withNativeWrite } from './setupNativeState'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

// the generated adapters are plain functions over the spec modules, so a test
// drives the element they build rather than mounting a native view. the spec
// modules collapse to named stubs and Platform pins iOS.
vi.mock('react-native', () => ({
  Platform: { OS: 'ios', Version: '26.4' },
}))
vi.mock('react-native/Libraries/Utilities/codegenNativeComponent', () => ({
  default: (name: string) => {
    const Stub = (_props: unknown) => null
    Stub.displayName = name
    return Stub
  },
}))

let Controls: typeof import('../src/platform/generated/Controls.native')
let sync: typeof import('../src/platform/syncNativeState')
let store: typeof import('../src/platform/syncStore')

beforeAll(async () => {
  Controls = await import('../src/platform/generated/Controls.native')
  sync = await import('../src/platform/syncNativeState')
  store = await import('../src/platform/syncStore')
})

const schema = JSON.parse(readFileSync(new URL('../schema.json', import.meta.url), 'utf8'))
const component = (publicName: string) =>
  schema.components.find((entry: { publicName: string }) => entry.publicName === publicName)

function stubOf(root: ReturnType<typeof create>, name: string) {
  return root.root.find((node) => (node.type as { displayName?: string })?.displayName === name)
}

const textEvent = (value: string) => ({
  nativeEvent: { value, eventCount: 1, revision: 0 },
})

describe('sync schema contract', () => {
  it('marks the text values sync and leaves the rest alone', () => {
    expect(component('TextField').controlled).toMatchObject({
      value: 'value',
      event: 'onNativeTextFieldValueChange',
      sync: true,
    })
    expect(component('TextField').props).toMatchObject({
      syncStateId: { type: 'Int32' },
    })
    expect(component('SecureField').props).toMatchObject({
      syncStateId: { type: 'Int32' },
    })
    expect(component('Toggle').controlled).toMatchObject({
      value: 'value',
      event: 'onNativeToggleValueChange',
      sync: true,
    })
    expect(component('Toggle').props).toMatchObject({
      syncStateId: { type: 'Int32' },
    })
    expect(component('SecureField').controlled).toMatchObject({
      value: 'value',
      event: 'onNativeSecureFieldValueChange',
      sync: true,
    })
    for (const [name, event] of [
      ['Slider', 'onNativeSliderValueChange'],
      ['Stepper', 'onNativeStepperValueChange'],
    ]) {
      expect(component(name).controlled).toMatchObject({ value: 'value', event, sync: true })
      expect(component(name).props).toMatchObject({ syncStateId: { type: 'Int32' } })
    }
    expect(component('Picker').props).not.toHaveProperty('syncStateId')
    expect(component('Picker').controlled).toMatchObject({
      value: 'value',
      event: 'onNativePickerValueChange',
    })
    expect(component('Picker').controlled).not.toHaveProperty('sync')
  })
})

describe('generated sync text bindings', () => {
  it('keeps plain strings on the old path', () => {
    const onTextChange = vi.fn()
    let root: ReturnType<typeof create>
    act(() => {
      root = create(<Controls.TextField text="hi" onTextChange={onTextChange} />)
    })
    const stub = stubOf(root!, 'OneNativeTextField')
    expect(stub.props.value).toBe('hi')
    act(() => {
      stub.props.onNativeTextFieldValueChange(textEvent('yo'))
    })
    expect(onTextChange).toHaveBeenCalledWith('yo')
  })

  it('resolves a handle to its value for the native view', () => {
    const handle = store.createSyncState('held')
    let root: ReturnType<typeof create>
    act(() => {
      root = create(<Controls.TextField text={handle} onTextChange={() => {}} />)
    })
    expect(stubOf(root!, 'OneNativeTextField').props.value).toBe('held')
  })

  it('binds the native view by handle id, or zero for plain strings', () => {
    const handle = store.createSyncState('held')
    let root: ReturnType<typeof create>
    act(() => {
      root = create(<Controls.TextField text={handle} onTextChange={() => {}} />)
    })
    expect(stubOf(root!, 'OneNativeTextField').props.syncStateId).toBe(
      store.getSyncStateId(handle)
    )
    act(() => {
      root = create(<Controls.TextField text="plain" onTextChange={() => {}} />)
    })
    expect(stubOf(root!, 'OneNativeTextField').props.syncStateId).toBe(0)
  })

  it('publishes a native edit to subscribers before the callback', () => {
    const { handle, nativeWrite } = withNativeWrite(() => store.createSyncState('hi'))
    const order: string[] = []
    handle.subscribe((value) => {
      order.push(`store:${value}`)
    })
    let readDuringCallback: string | undefined
    const onTextChange = (value: string) => {
      // the forwarded callback already sees the native write.
      readDuringCallback = handle.get()
      order.push(`callback:${value}`)
    }
    let root: ReturnType<typeof create>
    act(() => {
      root = create(<Controls.TextField text={handle} onTextChange={onTextChange} />)
    })
    nativeWrite('yo')
    act(() => {
      stubOf(root!, 'OneNativeTextField').props.onNativeTextFieldValueChange(textEvent('yo'))
    })
    expect(order).toEqual(['store:yo', 'callback:yo'])
    expect(readDuringCallback).toBe('yo')
    expect(handle.get()).toBe('yo')
    // and the bound view converges on the next render without prop drilling.
    expect(stubOf(root!, 'OneNativeTextField').props.value).toBe('yo')
  })

  it('never writes a late event back over newer native text', () => {
    // fast typing: the entry already holds 'pa' when the event for 'p' arrives.
    const { handle, nativeWrite } = withNativeWrite(() => store.createSyncState(''))
    const published: string[] = []
    handle.subscribe((value) => {
      published.push(value)
    })
    let root: ReturnType<typeof create>
    act(() => {
      root = create(<Controls.TextField text={handle} onTextChange={() => {}} />)
    })
    nativeWrite('p')
    nativeWrite('pa')
    act(() => {
      stubOf(root!, 'OneNativeTextField').props.onNativeTextFieldValueChange(textEvent('p'))
    })
    expect(handle.get()).toBe('pa')
    expect(published).toEqual(['pa'])
    expect(stubOf(root!, 'OneNativeTextField').props.value).toBe('pa')
  })

  it.each(['TextField', 'SecureField', 'TextEditor'] as const)(
    '%s preserves a native write between reading and publishing the entry',
    (name) => {
      const { handle, host, nativeWrite } = withNativeWrite(() =>
        store.createSyncState('')
      )
      const published: string[] = []
      handle.subscribe((value) => published.push(value))
      const Control = Controls[name]
      let root: ReturnType<typeof create>
      act(() => {
        root = create(<Control text={handle} onTextChange={() => {}} />)
      })
      nativeWrite('pa')
      const writeFromJS = vi.spyOn(host, 'set')
      const read = host.get.bind(host)
      vi.spyOn(host, 'get').mockImplementationOnce(() => {
        const snapshot = read()
        nativeWrite('pas')
        return snapshot
      })
      act(() => {
        stubOf(root!, `OneNative${name}`).props[`onNative${name}ValueChange`](
          textEvent('pa')
        )
      })
      expect(handle.get()).toBe('pas')
      expect(writeFromJS).not.toHaveBeenCalled()
      expect(published).toEqual(['pa'])
      act(() => {
        stubOf(root!, `OneNative${name}`).props[`onNative${name}ValueChange`]({
          nativeEvent: { value: 'pas', eventCount: 2, revision: 0 },
        })
      })
      expect(published).toEqual(['pa', 'pas'])
      expect(stubOf(root!, `OneNative${name}`).props.value).toBe('pas')
      expect(writeFromJS).not.toHaveBeenCalled()
    }
  )

  it.each(['Toggle', 'Slider', 'Stepper'] as const)(
    '%s preserves a native write between reading and publishing the entry',
    (name) => {
      const initial = name === 'Toggle' ? false : 0
      const first = name === 'Toggle' ? true : 1
      const latest = name === 'Toggle' ? false : 2
      const { handle, host, nativeWrite } = withNativeWrite(() =>
        store.createSyncState<boolean | number>(initial)
      )
      const published: (boolean | number)[] = []
      handle.subscribe((value) => published.push(value))
      let root: ReturnType<typeof create>
      act(() => {
        root = create(
          name === 'Toggle' ? (
            <Controls.Toggle
              isOn={handle as import('../src/platform/syncStore').SyncState<boolean>}
              onIsOnChange={() => {}}
            />
          ) : name === 'Slider' ? (
            <Controls.Slider
              value={handle as import('../src/platform/syncStore').SyncState<number>}
              onValueChange={() => {}}
            />
          ) : (
            <Controls.Stepper
              value={handle as import('../src/platform/syncStore').SyncState<number>}
              onValueChange={() => {}}
            />
          )
        )
      })
      nativeWrite(first)
      const writeFromJS = vi.spyOn(host, 'set')
      const read = host.get.bind(host)
      vi.spyOn(host, 'get').mockImplementationOnce(() => {
        const snapshot = read()
        nativeWrite(latest)
        return snapshot
      })
      act(() => {
        stubOf(root!, `OneNative${name}`).props[`onNative${name}ValueChange`]({
          nativeEvent: { value: first, eventCount: 1, revision: 0 },
        })
      })
      expect(handle.get()).toBe(latest)
      expect(writeFromJS).not.toHaveBeenCalled()
      expect(published).toEqual([first])
      act(() => {
        stubOf(root!, `OneNative${name}`).props[`onNative${name}ValueChange`]({
          nativeEvent: { value: latest, eventCount: 2, revision: 0 },
        })
      })
      expect(published).toEqual([first, latest])
      expect(stubOf(root!, `OneNative${name}`).props.value).toBe(latest)
      expect(writeFromJS).not.toHaveBeenCalled()
    }
  )

  it('converges bound views on writes from anywhere', () => {
    const handle = store.createSyncState('a')
    let root: ReturnType<typeof create>
    act(() => {
      root = create(<Controls.TextField text={handle} onTextChange={() => {}} />)
    })
    act(() => {
      handle.set('b')
    })
    expect(stubOf(root!, 'OneNativeTextField').props.value).toBe('b')
  })

  it('wires SecureField the same way', () => {
    const { handle, nativeWrite } = withNativeWrite(() => store.createSyncState('secret'))
    const onTextChange = vi.fn()
    let root: ReturnType<typeof create>
    act(() => {
      root = create(<Controls.SecureField text={handle} onTextChange={onTextChange} />)
    })
    const stub = stubOf(root!, 'OneNativeSecureField')
    expect(stub.props.value).toBe('secret')
    nativeWrite('new-secret')
    act(() => {
      stub.props.onNativeSecureFieldValueChange(textEvent('new-secret'))
    })
    expect(handle.get()).toBe('new-secret')
    expect(onTextChange).toHaveBeenCalledWith('new-secret')
  })

  it('wires Toggle to a boolean handle', () => {
    const { handle, nativeWrite } = withNativeWrite(() => store.createSyncState(false))
    const onIsOnChange = vi.fn()
    let root: ReturnType<typeof create>
    act(() => {
      root = create(<Controls.Toggle label="Notify" isOn={handle} onIsOnChange={onIsOnChange} />)
    })
    const stub = stubOf(root!, 'OneNativeToggle')
    expect(stub.props.value).toBe(false)
    expect(stub.props.syncStateId).toBe(store.getSyncStateId(handle))
    nativeWrite(true)
    act(() => {
      stub.props.onNativeToggleValueChange({ nativeEvent: { value: true, eventCount: 1, revision: 0 } })
    })
    expect(handle.get()).toBe(true)
    expect(onIsOnChange).toHaveBeenCalledWith(true)
    expect(stubOf(root!, 'OneNativeToggle').props.value).toBe(true)
  })

  it('rejects values that are neither strings nor handles', () => {
    expect(() =>
      act(() => {
        create(
          <Controls.TextField
            text={42 as unknown as string}
            onTextChange={() => {}}
          />
        )
      })
    ).toThrow('TextField text must be a string or NativeState handle')
  })
})

describe('sync prop helpers', () => {
  it('syncHandleOf unwraps handles and nulls scalars', () => {
    const handle = store.createSyncState('x')
    expect(sync.syncHandleOf(handle)).toBe(handle)
    expect(sync.syncHandleOf('x')).toBeNull()
  })

  it('useSyncValue passes scalars through and follows handles', () => {
    const handle = store.createSyncState('h')
    const rendered: string[] = []
    function Reader({ value }: { value: string | sync.NativeState<string> }) {
      rendered.push(sync.useSyncValue(value))
      return null
    }
    let root: ReturnType<typeof create>
    act(() => {
      root = create(<Reader value="plain" />)
    })
    act(() => {
      root.update(<Reader value={handle} />)
    })
    act(() => {
      handle.set('h2')
    })
    expect(rendered).toEqual(['plain', 'h', 'h2'])
  })
})
