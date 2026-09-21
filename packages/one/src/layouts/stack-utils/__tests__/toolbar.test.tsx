import { describe, expect, it, vi } from 'vitest'
import React from 'react'

import {
  TOOLBAR_KIND,
  appendStackToolbarPropsToOptions,
  slotChildrenToBottomData,
} from '../stackToolbarDescriptors'
import {
  StackToolbarComponent,
  StackToolbarItem,
  StackToolbarLeading,
  StackToolbarMenu,
  StackToolbarTrailing,
} from '../StackToolbar'

function toolbarProps(children: React.ReactNode) {
  return { children } as React.ComponentProps<typeof StackToolbarComponent>
}

describe('Stack.Toolbar composition', () => {
  it('maps leading items to unstable_headerLeftItems', () => {
    const onPress = vi.fn()
    const options = appendStackToolbarPropsToOptions(
      {},
      toolbarProps(
        <StackToolbarLeading>
            <StackToolbarItem title="Edit" systemImageName="pencil" onPress={onPress} />
          </StackToolbarLeading>
      )
    )
    const items = options.unstable_headerLeftItems?.({} as never)
    expect(items).toHaveLength(1)
    expect(items?.[0]).toMatchObject({
      type: 'button',
      label: 'Edit',
      icon: { type: 'sfSymbol', name: 'pencil' },
    })
    expect(options.unstable_headerRightItems).toBeUndefined()
  })

  it('maps trailing items to unstable_headerRightItems', () => {
    const options = appendStackToolbarPropsToOptions(
      {},
      toolbarProps(
        <StackToolbarTrailing>
            <StackToolbarItem title="Done" onPress={() => {}} />
          </StackToolbarTrailing>
      )
    )
    const items = options.unstable_headerRightItems?.({} as never)
    expect(items).toHaveLength(1)
    expect(items?.[0]).toMatchObject({ type: 'button', label: 'Done' })
    expect(options.unstable_headerLeftItems).toBeUndefined()
  })

  it('passes tintColor through by identity, including dynamic values', () => {
    const dynamic = { light: '#fff', dark: '#000' } as unknown as import('react-native').ColorValue
    const options = appendStackToolbarPropsToOptions(
      {},
      toolbarProps(
        <StackToolbarLeading>
            <StackToolbarItem title="Edit" tintColor={dynamic} onPress={() => {}} />
          </StackToolbarLeading>
      )
    )
    const items = options.unstable_headerLeftItems?.({} as never)
    expect(items).toHaveLength(1)
    const [first] = items as [{ tintColor?: unknown }]
    expect(first).toMatchObject({ tintColor: dynamic })
    expect(first.tintColor).toBe(dynamic)
  })

  it('wires onSelected as an onPress alias and keeps accessibility props', () => {
    const onSelected = vi.fn()
    const options = appendStackToolbarPropsToOptions(
      {},
      toolbarProps(
        <StackToolbarLeading>
            <StackToolbarItem
              title="Edit"
              accessibilityLabel="Edit entry"
              accessibilityHint="Opens the editor"
              disabled
              selected
              onSelected={onSelected}
            />
          </StackToolbarLeading>
      )
    )
    const item = options.unstable_headerLeftItems?.({} as never)?.[0] as {
      onPress?: () => void
    }
    item?.onPress?.()
    expect(onSelected).toHaveBeenCalledOnce()
    expect(item).toMatchObject({
      accessibilityLabel: 'Edit entry',
      accessibilityHint: 'Opens the editor',
      disabled: true,
      selected: true,
    })
  })

  it('passes background sharing through to header buttons and menus, including false', () => {
    const options = appendStackToolbarPropsToOptions(
      {},
      toolbarProps([
        <StackToolbarLeading key="leading">
          <StackToolbarItem
            title="Edit"
            sharesBackground={false}
            hidesSharedBackground
            onPress={() => {}}
          />
        </StackToolbarLeading>,
        <StackToolbarTrailing key="trailing">
          <StackToolbarMenu title="More" sharesBackground>
            <StackToolbarItem title="Share" onPress={() => {}} />
          </StackToolbarMenu>

        </StackToolbarTrailing>,
      ])
    )
    expect(options.unstable_headerLeftItems?.({} as never)?.[0]).toMatchObject({
      sharesBackground: false,
      hidesSharedBackground: true,
    })
    expect(options.unstable_headerRightItems?.({} as never)?.[0]).toMatchObject({
      sharesBackground: true,
    })
  })

  it('carries background sharing in bottom descriptors', () => {
    const data = slotChildrenToBottomData([
      <StackToolbarItem
        key="add"
        title="Add"
        sharesBackground={false}
        hidesSharedBackground
        onPress={() => {}}
      />,
      <StackToolbarMenu key="more" title="More" sharesBackground>
        <StackToolbarItem title="Share" onPress={() => {}} />
      </StackToolbarMenu>,
    ])
    expect(data[0]).toMatchObject({
      kind: 'item',
      sharesBackground: false,
      hidesSharedBackground: true,
    })
    expect(data[1]).toMatchObject({ kind: 'menu', sharesBackground: true })
  })

  it('clears header items when an explicit slot has no visible items', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const options = appendStackToolbarPropsToOptions(
        {},
        toolbarProps(
          <StackToolbarLeading>
            <StackToolbarItem title="Hidden" hidden onPress={() => {}} />
            <StackToolbarItem onPress={() => {}} />
          </StackToolbarLeading>
        )
      )
      // explicit slot wins: empty array clears inherited items.
      expect(options.unstable_headerLeftItems?.({} as never)).toEqual([])
      expect(warn).toHaveBeenCalled()
    } finally {
      warn.mockRestore()
    }
  })

  it('clears stale incoming items on both sides while absent slots preserve', () => {
    const staleLeft = { type: 'button', label: 'stale-left', onPress: () => {} }
    const staleRight = { type: 'button', label: 'stale-right', onPress: () => {} }
    const incoming = {
      unstable_headerLeftItems: () => [staleLeft],
      unstable_headerRightItems: () => [staleRight],
    }

    const cleared = appendStackToolbarPropsToOptions(
      incoming as never,
      toolbarProps([
        <StackToolbarLeading key="leading">
          <StackToolbarItem title="Hidden" hidden onPress={() => {}} />
        </StackToolbarLeading>,
        <StackToolbarTrailing key="trailing">
          <StackToolbarItem title="Also hidden" hidden onPress={() => {}} />
        </StackToolbarTrailing>,
      ])
    )
    expect(cleared.unstable_headerLeftItems?.({} as never)).toEqual([])
    expect(cleared.unstable_headerRightItems?.({} as never)).toEqual([])

    const preserved = appendStackToolbarPropsToOptions(
      incoming as never,
      toolbarProps(undefined)
    )
    expect(preserved.unstable_headerLeftItems?.({} as never)).toEqual([staleLeft])
    expect(preserved.unstable_headerRightItems?.({} as never)).toEqual([staleRight])
  })

  it('drives visible-to-hidden through actual setOptions transitions', () => {
    const calls: unknown[][] = []
    const navigation = { setOptions: (...args: unknown[]) => void calls.push(args) }

    const visibleToolbar = (
      <StackToolbarTrailing>
        <StackToolbarItem title="Probe" systemImageName="magnifyingglass" onPress={() => {}} />
      </StackToolbarTrailing>
    )
    navigation.setOptions(appendStackToolbarPropsToOptions({}, toolbarProps(visibleToolbar)))
    const hiddenToolbar = (
      <StackToolbarTrailing>
        <StackToolbarItem title="Probe" systemImageName="magnifyingglass" hidden onPress={() => {}} />
      </StackToolbarTrailing>
    )
    navigation.setOptions(appendStackToolbarPropsToOptions({}, toolbarProps(hiddenToolbar)))

    expect(calls).toHaveLength(2)
    const first = calls[0][0] as {
      unstable_headerRightItems?: (props: never) => unknown[]
    }
    const second = calls[1][0] as {
      unstable_headerRightItems?: (props: never) => unknown[]
    }
    expect(first.unstable_headerRightItems?.({} as never)).toHaveLength(1)
    expect(second.unstable_headerRightItems?.({} as never)).toEqual([])
  })

  it('maps menus to header menu items with actions and submenus', () => {
    const onShare = vi.fn()
    const options = appendStackToolbarPropsToOptions(
      {},
      toolbarProps(
        <StackToolbarTrailing>
            <StackToolbarMenu title="More" systemImageName="ellipsis.circle">
              <StackToolbarItem title="Share" onPress={onShare} />
              <StackToolbarItem title="Delete" destructive onPress={() => {}} />
              <StackToolbarMenu title="Advanced">
                <StackToolbarItem title="Inspect" selected onPress={() => {}} />
              </StackToolbarMenu>
            </StackToolbarMenu>
          </StackToolbarTrailing>
      )
    )
    const items = options.unstable_headerRightItems?.({} as never)
    expect(items).toHaveLength(1)
    expect(items).toHaveLength(1)
    const menu = items?.[0] as { type: string; menu: { items: unknown[] } }
    expect(menu.type).toBe('menu')
    expect(menu.menu.items).toHaveLength(3)
    const [share, remove, submenu] = menu.menu.items as [
      { type: string; label: string; onPress: () => void },
      { type: string; destructive?: boolean },
      { type: string; label: string; items: { type: string }[] },
    ]
    expect(share).toMatchObject({ type: 'action', label: 'Share' })
    share.onPress()
    expect(onShare).toHaveBeenCalledOnce()
    expect(remove).toMatchObject({ type: 'action', destructive: true })
    expect(submenu).toMatchObject({ type: 'submenu', label: 'Advanced' })
    expect(submenu.items[0]).toMatchObject({ type: 'action', state: 'on' })
  })

  it('warns on bottom slots in layout config and leaves options without header items', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const FakeBottom = Object.assign(() => null, { [TOOLBAR_KIND]: 'bottom' })
      const before = { title: 'Kept' }
      const options = appendStackToolbarPropsToOptions(
        before,
        toolbarProps([
          React.createElement(FakeBottom, {
            key: 'bottom',
            children: <StackToolbarItem title="Add" onPress={() => {}} />,
          }),
          <StackToolbarItem key="orphan" title="Orphan" onPress={() => {}} />,
        ])
      )
      expect(options).toMatchObject({ title: 'Kept' })
      expect(options.unstable_headerLeftItems).toBeUndefined()
      expect(options.unstable_headerRightItems).toBeUndefined()
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('Stack.Toolbar.Bottom in layout config has no effect')
      )
    } finally {
      warn.mockRestore()
    }
  })

  it('builds bottom descriptors preserving hidden, identifiers, and nesting', () => {
    const data = slotChildrenToBottomData([
      <StackToolbarItem key="add" title="Add" systemImageName="plus" onPress={() => {}} />,
      <StackToolbarItem key="secret" title="Secret" hidden onPress={() => {}} />,
      <StackToolbarMenu key="more" title="More" systemImageName="ellipsis.circle">
        <StackToolbarItem title="Mark" destructive onPress={() => {}} />
        <StackToolbarMenu title="Advanced">
          <StackToolbarItem title="Inspect" selected onPress={() => {}} />
        </StackToolbarMenu>
      </StackToolbarMenu>,
    ])
    expect(data).toHaveLength(3)
    expect(data[0]).toMatchObject({ kind: 'item', title: 'Add', hidden: undefined })
    expect(data[1]).toMatchObject({ kind: 'item', title: 'Secret', hidden: true })
    const menu = data[2]
    expect(menu.kind).toBe('menu')
    if (menu.kind === 'menu') {
      expect(menu.children).toHaveLength(2)
      expect(menu.children[0]).toMatchObject({ kind: 'item', destructive: true })
      expect(menu.children[1]).toMatchObject({ kind: 'menu', title: 'Advanced' })
    }
    const identifiers = new Set<string>()
    const collect = (entries: typeof data): void => {
      for (const entry of entries) {
        expect(entry.identifier).toMatch(/^stack-toolbar-bottom-/)
        identifiers.add(entry.identifier)
        if (entry.kind === 'menu') collect(entry.children)
      }
    }
    collect(data)
    expect(identifiers.size).toBe(6)
  })

  it('preserves existing options', () => {
    const options = appendStackToolbarPropsToOptions(
      { animation: 'slide_from_right' },
      toolbarProps(undefined)
    )
    expect(options).toMatchObject({ animation: 'slide_from_right' })
  })
})
