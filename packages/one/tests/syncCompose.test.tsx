import { beforeAll, describe, expect, it, vi } from 'vitest'
import { act, create } from 'react-test-renderer'
import { withNativeWrite } from './setupNativeState'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

// the Compose TextField is a plain function over the spec module, like the
// generated iOS adapters: the spec collapses to a named stub and the test
// drives the element it builds.
vi.mock('react-native/Libraries/Utilities/codegenNativeComponent', () => ({
  default: (name: string) => {
    const Stub = (_props: unknown) => null
    Stub.displayName = name
    return Stub
  },
}))

let Compose: typeof import('../src/platform/compose.android').Compose
let store: typeof import('../src/platform/syncStore')

beforeAll(async () => {
  Compose = (await import('../src/platform/compose.android')).Compose
  store = await import('../src/platform/syncStore')
})

function stubOf(root: ReturnType<typeof create>) {
  return root.root.find(
    (node) =>
      (node.type as { displayName?: string })?.displayName ===
      'OneNativeComposeNode'
  )
}

const textEvent = (text: string, eventCount = 1) => ({
  nativeEvent: { text, eventCount, revision: 0 },
})

describe('compose sync text binding', () => {
  it('keeps plain strings on the old path', () => {
    const onTextChange = vi.fn()
    let root: ReturnType<typeof create>
    act(() => {
      root = create(<Compose.TextField text="hi" onTextChange={onTextChange} />)
    })
    const stub = stubOf(root!)
    expect(stub.props.textValue).toBe('hi')
    expect(stub.props.syncStateId).toBe(0)
    act(() => {
      stub.props.onNativeComposeNodeTextValueChange(textEvent('yo'))
    })
    expect(onTextChange).toHaveBeenCalledWith('yo')
  })

  it('resolves a handle and binds the node by its id', () => {
    const handle = store.createSyncState('held')
    let root: ReturnType<typeof create>
    act(() => {
      root = create(<Compose.TextField text={handle} onTextChange={() => {}} />)
    })
    const stub = stubOf(root!)
    expect(stub.props.textValue).toBe('held')
    expect(stub.props.syncStateId).toBe(store.getSyncStateId(handle))
  })

  it('publishes a native edit to subscribers before the callback', () => {
    const { handle, nativeWrite } = withNativeWrite(() =>
      store.createSyncState('hi')
    )
    const order: string[] = []
    handle.subscribe((value) => {
      order.push(`store:${value}`)
    })
    let readDuringCallback: string | undefined
    const onTextChange = (value: string) => {
      readDuringCallback = handle.get()
      order.push(`callback:${value}`)
    }
    let root: ReturnType<typeof create>
    act(() => {
      root = create(
        <Compose.TextField text={handle} onTextChange={onTextChange} />
      )
    })
    nativeWrite('yo')
    act(() => {
      stubOf(root!).props.onNativeComposeNodeTextValueChange(textEvent('yo'))
    })
    expect(order).toEqual(['store:yo', 'callback:yo'])
    expect(readDuringCallback).toBe('yo')
    expect(stubOf(root!).props.textValue).toBe('yo')
  })

  it('never writes a late event back over newer native text', () => {
    // fast typing: the entry already holds 'pa' when the event for 'p' arrives.
    const { handle, nativeWrite } = withNativeWrite(() =>
      store.createSyncState('')
    )
    const published: string[] = []
    handle.subscribe((value) => {
      published.push(value)
    })
    const changes: string[] = []
    let root: ReturnType<typeof create>
    act(() => {
      root = create(
        <Compose.TextField
          text={handle}
          onTextChange={(text) => changes.push(text)}
        />
      )
    })
    nativeWrite('p')
    nativeWrite('pa')
    act(() => {
      stubOf(root!).props.onNativeComposeNodeTextValueChange(textEvent('p', 1))
    })
    expect(handle.get()).toBe('pa')
    expect(published).toEqual(['pa'])
    act(() => {
      stubOf(root!).props.onNativeComposeNodeTextValueChange(textEvent('pa', 2))
    })
    expect(handle.get()).toBe('pa')
    expect(published).toEqual(['pa'])
    expect(changes).toEqual(['p', 'pa'])
    expect(stubOf(root!).props.textValue).toBe('pa')
  })

  it('preserves a native write between reading and publishing the entry', () => {
    const { handle, host, nativeWrite } = withNativeWrite(() => store.createSyncState(''))
    const published: string[] = []
    handle.subscribe((value) => published.push(value))
    let root: ReturnType<typeof create>
    act(() => {
      root = create(<Compose.TextField text={handle} onTextChange={() => {}} />)
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
      stubOf(root!).props.onNativeComposeNodeTextValueChange(textEvent('pa'))
    })
    expect(handle.get()).toBe('pas')
    expect(writeFromJS).not.toHaveBeenCalled()
    expect(published).toEqual(['pa'])
    act(() => {
      stubOf(root!).props.onNativeComposeNodeTextValueChange(textEvent('pas', 2))
    })
    expect(published).toEqual(['pa', 'pas'])
    expect(stubOf(root!).props.textValue).toBe('pas')
    expect(writeFromJS).not.toHaveBeenCalled()
  })

  it('converges bound nodes on writes from anywhere', () => {
    const handle = store.createSyncState('a')
    let root: ReturnType<typeof create>
    act(() => {
      root = create(<Compose.TextField text={handle} onTextChange={() => {}} />)
    })
    act(() => {
      handle.set('b')
    })
    expect(stubOf(root!).props.textValue).toBe('b')
  })

  it('rejects values that are neither strings nor handles', () => {
    expect(() =>
      act(() => {
        create(
          <Compose.TextField
            text={42 as unknown as string}
            onTextChange={() => {}}
          />
        )
      })
    ).toThrow('Compose TextField text must be a string or NativeState handle')
  })
})
