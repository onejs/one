import { readFileSync } from 'node:fs'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { act, create } from 'react-test-renderer'

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

let Controls: typeof import('../src/generated/Controls.native')
let sync: typeof import('../src/syncNativeState')
let store: typeof import('../src/syncStore')

beforeAll(async () => {
  Controls = await import('../src/generated/Controls.native')
  sync = await import('../src/syncNativeState')
  store = await import('../src/syncStore')
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
    expect(component('Slider').props).not.toHaveProperty('syncStateId')
    expect(component('SecureField').controlled).toMatchObject({
      value: 'value',
      event: 'onNativeSecureFieldValueChange',
      sync: true,
    })
    expect(component('Slider').controlled).toMatchObject({
      value: 'value',
      event: 'onNativeSliderValueChange',
    })
    expect(component('Slider').controlled).not.toHaveProperty('sync')
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

  it('writes native events into the handle in the same frame', () => {
    const handle = store.createSyncState('hi')
    const order: string[] = []
    handle.subscribe((value) => {
      order.push(`store:${value}`)
    })
    let readDuringCallback: string | undefined
    const onTextChange = (value: string) => {
      // the forwarded callback already sees the write: it landed before React.
      readDuringCallback = handle.get()
      order.push(`callback:${value}`)
    }
    let root: ReturnType<typeof create>
    act(() => {
      root = create(<Controls.TextField text={handle} onTextChange={onTextChange} />)
    })
    act(() => {
      stubOf(root!, 'OneNativeTextField').props.onNativeTextFieldValueChange(textEvent('yo'))
    })
    expect(order).toEqual(['store:yo', 'callback:yo'])
    expect(readDuringCallback).toBe('yo')
    expect(handle.get()).toBe('yo')
    // and the bound view converges on the next render without prop drilling.
    expect(stubOf(root!, 'OneNativeTextField').props.value).toBe('yo')
  })

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
    const handle = store.createSyncState('secret')
    const onTextChange = vi.fn()
    let root: ReturnType<typeof create>
    act(() => {
      root = create(<Controls.SecureField text={handle} onTextChange={onTextChange} />)
    })
    const stub = stubOf(root!, 'OneNativeSecureField')
    expect(stub.props.value).toBe('secret')
    act(() => {
      stub.props.onNativeSecureFieldValueChange(textEvent('new-secret'))
    })
    expect(handle.get()).toBe('new-secret')
    expect(onTextChange).toHaveBeenCalledWith('new-secret')
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
