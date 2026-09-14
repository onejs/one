import React, { useState } from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  Bridge,
  setNativeBridge,
  NativeBridgeInterface,
  render,
  unmount,
  View,
  Text,
  Button,
  TextInput,
} from '../src'

;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true

interface RecordedCall {
  method: string
  args: any[]
}

function createFakeBridge() {
  const calls: RecordedCall[] = []
  const views = new Map<
    number,
    { type: string; props: Record<string, any>; children: number[] }
  >()

  const bridge: NativeBridgeInterface = {
    createView(type: string, id: number) {
      calls.push({ method: 'createView', args: [type, id] })
      views.set(id, { type, props: {}, children: [] })
    },
    setProp(id: number, key: string, value: any) {
      calls.push({ method: 'setProp', args: [id, key, value] })
      const v = views.get(id)
      if (v) v.props[key] = value
    },
    appendChild(parentId: number, childId: number) {
      calls.push({ method: 'appendChild', args: [parentId, childId] })
      const p = views.get(parentId)
      if (p) {
        const existingIdx = p.children.indexOf(childId)
        if (existingIdx !== -1) {
          p.children.splice(existingIdx, 1)
        }
        p.children.push(childId)
      }
    },
    removeChild(parentId: number, childId: number) {
      calls.push({ method: 'removeChild', args: [parentId, childId] })
      const p = views.get(parentId)
      if (p) {
        p.children = p.children.filter((id) => id !== childId)
      }
    },
    insertBefore(parentId: number, childId: number, beforeId: number) {
      calls.push({ method: 'insertBefore', args: [parentId, childId, beforeId] })
      const p = views.get(parentId)
      if (p) {
        p.children = p.children.filter((id) => id !== childId)
        const idx = p.children.indexOf(beforeId)
        if (idx !== -1) {
          p.children.splice(idx, 0, childId)
        } else {
          p.children.push(childId)
        }
      }
    },
    calculateLayout(rootId: number, width: number, height: number) {
      calls.push({ method: 'calculateLayout', args: [rootId, width, height] })
    },
    destroyView(id: number) {
      calls.push({ method: 'destroyView', args: [id] })
      if (!views.has(id)) {
        throw new Error(
          `destroyView called for view ${id} that does not exist or was already destroyed`
        )
      }
      views.delete(id)
    },
  }

  return { bridge, calls, views }
}

describe('React Native Lite Renderer', () => {
  let fake: ReturnType<typeof createFakeBridge>

  beforeEach(() => {
    fake = createFakeBridge()
    setNativeBridge(fake.bridge)
    ;(globalThis as any).__nativeBridge = fake.bridge
  })

  afterEach(async () => {
    await React.act(async () => {
      unmount(1)
      unmount(2)
    })
    setNativeBridge(null)
    delete (globalThis as any).__nativeBridge
    Bridge.reset()
  })

  describe('Typed Injectable Bridge', () => {
    it('fails clearly when native bridge is missing and does not fallback to console mock', () => {
      setNativeBridge(null)
      delete (globalThis as any).__nativeBridge

      expect(() => {
        const _b = Bridge.bridge
      }).toThrow(/bridge is not installed/i)
    })
  })

  describe('Initial Mount', () => {
    it('drives fake bridge to allocate views, set props, and assemble hierarchy at commit', async () => {
      const onPress = vi.fn()
      await React.act(async () => {
        render(
          <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
            <Button title="Click Me" onPress={onPress} />
            <Text>Hello World</Text>
            <TextInput placeholder="Enter text" filterRegex="^[0-9]+$" />
          </View>,
          1
        )
      })

      const createViewCalls = fake.calls.filter((c) => c.method === 'createView')
      expect(createViewCalls.length).toBeGreaterThanOrEqual(4)

      // Verify button prop
      const buttonCreate = createViewCalls.find((c) => c.args[0] === 'button')
      expect(buttonCreate).toBeDefined()
      const buttonId = buttonCreate!.args[1]

      const buttonTitleProp = fake.calls.find(
        (c) => c.method === 'setProp' && c.args[0] === buttonId && c.args[1] === 'title'
      )
      expect(buttonTitleProp).toBeDefined()
      expect(buttonTitleProp!.args[2]).toBe('Click Me')

      // Verify event dispatch
      await React.act(async () => {
        Bridge.dispatchNativeEvent(buttonId, 'press', {})
      })
      expect(onPress).toHaveBeenCalledTimes(1)

      // Verify layout was calculated at commit
      const layoutCall = fake.calls.find((c) => c.method === 'calculateLayout')
      expect(layoutCall).toBeDefined()
    })
  })

  describe('Consecutive State Updates (0 -> 1 -> 2)', () => {
    it('correctly commits updates reaching 0 -> 1 -> 2 without forwarding Fiber fields', async () => {
      let triggerUpdate: () => void = () => {}

      function Counter() {
        const [count, setCount] = useState(0)
        triggerUpdate = () => setCount((c) => c + 1)
        return (
          <View>
            <Button title={String(count)} />
          </View>
        )
      }

      await React.act(async () => {
        render(<Counter />, 1)
      })

      const buttonCreate = fake.calls.find(
        (c) => c.method === 'createView' && c.args[0] === 'button'
      )
      expect(buttonCreate).toBeDefined()
      const buttonId = buttonCreate!.args[1]

      // Record titles set on this button
      const getButtonTitles = () =>
        fake.calls
          .filter(
            (c) =>
              c.method === 'setProp' && c.args[0] === buttonId && c.args[1] === 'title'
          )
          .map((c) => c.args[2])

      expect(getButtonTitles()).toEqual(['0'])

      // First update: 0 -> 1
      await React.act(async () => {
        triggerUpdate()
      })
      expect(getButtonTitles()).toEqual(['0', '1'])

      // Second update: 1 -> 2
      await React.act(async () => {
        triggerUpdate()
      })
      expect(getButtonTitles()).toEqual(['0', '1', '2'])

      // Ensure NO Fiber fields were forwarded to native bridge setProp
      const forbiddenFiberKeys = [
        'tag',
        'key',
        'elementType',
        'type',
        'stateNode',
        'return',
        'child',
        'sibling',
        'index',
        'ref',
        'pendingProps',
        'memoizedProps',
        'memoizedState',
        'updateQueue',
        'dependencies',
        'mode',
        'flags',
        'subtreeFlags',
        'deletions',
        'lanes',
        'childLanes',
        'alternate',
      ]

      for (const call of fake.calls) {
        if (call.method === 'setProp') {
          const propKey = call.args[1]
          expect(forbiddenFiberKeys).not.toContain(propKey)
        }
      }
    })
  })

  describe('Subtree Removal and Teardown', () => {
    it('tears down removed subtrees, detaching native views and unregistering all handlers', async () => {
      let setMounted: (m: boolean) => void = () => {}
      const onPress = vi.fn()
      const onChangeText = vi.fn()

      function ConditionalSubtree() {
        const [show, setShow] = useState(true)
        setMounted = setShow
        return (
          <View>
            {show ? (
              <View>
                <Button title="Nested Button" onPress={onPress} />
                <TextInput
                  placeholder="Phone"
                  onChangeText={onChangeText}
                  filterRegex="^[0-9]+$"
                />
              </View>
            ) : null}
          </View>
        )
      }

      await React.act(async () => {
        render(<ConditionalSubtree />, 1)
      })

      const buttonCreate = fake.calls.find(
        (c) => c.method === 'createView' && c.args[0] === 'button'
      )
      expect(buttonCreate).toBeDefined()
      const buttonId = buttonCreate!.args[1]

      const inputCreate = fake.calls.find(
        (c) => c.method === 'createView' && c.args[0] === 'textinput'
      )
      expect(inputCreate).toBeDefined()
      const inputId = inputCreate!.args[1]

      // Handlers are active before removal
      await React.act(async () => {
        Bridge.dispatchNativeEvent(buttonId, 'press', {})
      })
      expect(onPress).toHaveBeenCalledTimes(1)

      expect(Bridge.shouldChangeText(inputId, 0, 1, '5')).toBe(true)
      expect(Bridge.shouldChangeText(inputId, 0, 1, 'x')).toBe(false)

      // Now unmount the subtree
      await React.act(async () => {
        setMounted(false)
      })

      // Assert removeChild was called on native bridge
      const removeCalls = fake.calls.filter((c) => c.method === 'removeChild')
      expect(removeCalls.length).toBeGreaterThan(0)

      // Handlers must be unregistered from Bridge
      await React.act(async () => {
        Bridge.dispatchNativeEvent(buttonId, 'press', {})
      })
      expect(onPress).toHaveBeenCalledTimes(1) // not incremented

      // Text validation should no longer restrict (returns default true when unregistered)
      expect(Bridge.shouldChangeText(inputId, 0, 1, 'x')).toBe(true)
      expect(Bridge.hasRegisteredHandlers(buttonId)).toBe(false)
      expect(Bridge.hasRegisteredHandlers(inputId)).toBe(false)
      expect(fake.views.has(buttonId)).toBe(false)
      expect(fake.views.has(inputId)).toBe(false)
    })

    it('clears container and tears down all children on unmount', async () => {
      const onPress = vi.fn()

      await React.act(async () => {
        render(
          <View>
            <Button title="To be cleared" onPress={onPress} />
          </View>,
          1
        )
      })

      expect(Bridge.getRegisteredHandlerCount()).toBeGreaterThan(0)
      expect(fake.views.size).toBeGreaterThan(0)

      await React.act(async () => {
        unmount(1)
      })

      expect(Bridge.getRegisteredHandlerCount()).toBe(0)
      expect(fake.views.size).toBe(0)
      const removeCalls = fake.calls.filter((c) => c.method === 'removeChild')
      expect(removeCalls.length).toBeGreaterThan(0)
    })
  })

  describe('Interrupted / Aborted Render', () => {
    it('produces ZERO native creates, appends, property mutations, or event registrations when render throws', async () => {
      function BuggyComponent(): React.ReactNode {
        throw new Error('Simulated render error')
      }

      function App() {
        return (
          <View>
            <Button title="Pre-crash Button" onPress={() => {}} />
            <BuggyComponent />
            <Text>Post-crash Text</Text>
          </View>
        )
      }

      fake.calls.length = 0

      const originalConsoleError = console.error
      console.error = vi.fn()

      try {
        await React.act(async () => {
          render(<App />, 2)
        })
      } catch {
        // Expected error from BuggyComponent
      } finally {
        console.error = originalConsoleError
      }

      // Assert: ZERO native bridge creates, appends, or property mutations
      const bridgeCreates = fake.calls.filter((c) => c.method === 'createView')
      const bridgeAppends = fake.calls.filter(
        (c) => c.method === 'appendChild' || c.method === 'insertBefore'
      )
      const bridgeProps = fake.calls.filter((c) => c.method === 'setProp')

      expect(bridgeCreates).toEqual([])
      expect(bridgeAppends).toEqual([])
      expect(bridgeProps).toEqual([])
      expect(Bridge.getRegisteredHandlerCount()).toBe(0)
    })
  })

  describe('Lifecycle Teardown and Keyed Moves Contract', () => {
    it('destroys each native view exactly once on unmount and leaves zero retained views', async () => {
      await React.act(async () => {
        render(
          <View>
            <Button title="Child" />
          </View>,
          1
        )
      })

      const createCalls = fake.calls.filter((c) => c.method === 'createView')
      expect(createCalls).toHaveLength(2)
      const [viewId, buttonId] = createCalls.map((c) => c.args[1])
      expect(fake.views.size).toBe(2)

      await React.act(async () => {
        unmount(1)
      })

      const destroyCalls = fake.calls.filter((c) => c.method === 'destroyView')
      expect(destroyCalls.map((c) => c.args[0]).sort()).toEqual([viewId, buttonId].sort())
      expect(destroyCalls).toHaveLength(2)
      expect(fake.views.size).toBe(0)
    })

    it('retains exact children in requested order without duplicates on keyed reorder', async () => {
      let setOrder: (items: string[]) => void = () => {}

      function ReorderList() {
        const [items, setItems] = useState(['a', 'b', 'c'])
        setOrder = setItems
        return (
          <View>
            {items.map((key) => (
              <Button key={key} title={key} />
            ))}
          </View>
        )
      }

      let root: any
      await React.act(async () => {
        root = render(<ReorderList />, 1)
      })

      const container = root.containerInfo
      const parentInstance = container.children[0]
      expect(parentInstance.children).toHaveLength(3)
      expect(parentInstance.children.map((c: any) => c.props.title)).toEqual([
        'a',
        'b',
        'c',
      ])

      const parentNative = fake.views.get(parentInstance.id)!
      expect(parentNative.children).toHaveLength(3)

      // reorder [a, b, c] -> [c, a, b]
      await React.act(async () => {
        setOrder(['c', 'a', 'b'])
      })

      // internal children must have length 3 in [c, a, b] order without duplicates
      expect(parentInstance.children).toHaveLength(3)
      expect(parentInstance.children.map((c: any) => c.props.title)).toEqual([
        'c',
        'a',
        'b',
      ])

      // native bridge hierarchy must also have length 3 in [c, a, b] order without duplicates
      expect(parentNative.children).toHaveLength(3)
      expect(parentNative.children.map((id) => fake.views.get(id)!.props.title)).toEqual([
        'c',
        'a',
        'b',
      ])

      await React.act(async () => {
        unmount(1)
      })
      expect(fake.views.size).toBe(0)
    })

    it('retains exact container children in requested order without duplicates on keyed reorder', async () => {
      let setOrder: (items: string[]) => void = () => {}

      function ContainerReorderList() {
        const [items, setItems] = useState(['a', 'b', 'c'])
        setOrder = setItems
        return (
          <>
            {items.map((key) => (
              <Button key={key} title={key} />
            ))}
          </>
        )
      }

      let root: any
      await React.act(async () => {
        root = render(<ContainerReorderList />, 1)
      })

      const container = root.containerInfo
      expect(container.children).toHaveLength(3)
      expect(container.children.map((c: any) => c.props.title)).toEqual(['a', 'b', 'c'])

      // reorder [a, b, c] -> [c, a, b]
      await React.act(async () => {
        setOrder(['c', 'a', 'b'])
      })

      // container children must have length 3 in [c, a, b] order without duplicates
      expect(container.children).toHaveLength(3)
      expect(container.children.map((c: any) => c.props.title)).toEqual(['c', 'a', 'b'])

      await React.act(async () => {
        unmount(1)
      })
      expect(fake.views.size).toBe(0)
    })
  })
})
