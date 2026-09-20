import { beforeAll, describe, expect, it, vi } from 'vitest'
import { act, create } from 'react-test-renderer'

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

let Compose: typeof import('../src/compose.android').Compose
let store: typeof import('../src/syncStore')

beforeAll(async () => {
  Compose = (await import('../src/compose.android')).Compose
  store = await import('../src/syncStore')
})

function stubOf(root: ReturnType<typeof create>) {
  return root.root.find(
    (node) =>
      (node.type as { displayName?: string })?.displayName ===
      'OneNativeComposeNode'
  )
}

const textEvent = (text: string) => ({
  nativeEvent: { text, eventCount: 1, revision: 0 },
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

  it('writes native events into the handle in the same frame', () => {
    const handle = store.createSyncState('hi')
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
    act(() => {
      stubOf(root!).props.onNativeComposeNodeTextValueChange(textEvent('yo'))
    })
    expect(order).toEqual(['store:yo', 'callback:yo'])
    expect(readDuringCallback).toBe('yo')
    expect(stubOf(root!).props.textValue).toBe('yo')
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
