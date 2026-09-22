import { describe, expect, it, vi } from 'vitest'
import React from 'react'

vi.mock('@vxrn/native', () => ({
  MenuAction: () => null,
  ToolbarHost: () => null,
  ToolbarItem: () => null,
}))

import {
  TOOLBAR_KIND,
  appendStackToolbarPropsToOptions,
  toolbarChildrenToBottomData,
} from '../stackToolbarDescriptors'
import {
  StackToolbarBadge,
  StackToolbarButton,
  StackToolbarComponent,
  StackToolbarIcon,
  StackToolbarLabel,
  StackToolbarMenu,
  StackToolbarMenuAction,
  StackToolbarSearchBarSlot,
  StackToolbarSpacer,
} from '../StackToolbar'

function toolbarProps(
  children: React.ReactNode,
  placement?: React.ComponentProps<typeof StackToolbarComponent>['placement']
) {
  return { children, placement } as React.ComponentProps<typeof StackToolbarComponent>
}

describe('Stack.Toolbar composition', () => {
  it('maps left buttons to unstable_headerLeftItems and shows the header', () => {
    const onPress = vi.fn()
    const options = appendStackToolbarPropsToOptions(
      {},
      toolbarProps(
        <StackToolbarButton icon="pencil" onPress={onPress}>
          Edit
        </StackToolbarButton>,
        'left'
      )
    )
    expect(options.headerShown).toBe(true)
    const items = options.unstable_headerLeftItems?.({} as never)
    expect(items).toHaveLength(1)
    expect(items?.[0]).toMatchObject({
      type: 'button',
      label: 'Edit',
      icon: { type: 'sfSymbol', name: 'pencil' },
      sharesBackground: true,
      selected: false,
    })
    expect(options.unstable_headerRightItems).toBeUndefined()
  })

  it('maps right buttons with variant and selected state', () => {
    const options = appendStackToolbarPropsToOptions(
      {},
      toolbarProps(
        <StackToolbarButton variant="done" selected onPress={() => {}}>
          Done
        </StackToolbarButton>,
        'right'
      )
    )
    const items = options.unstable_headerRightItems?.({} as never)
    expect(items).toHaveLength(1)
    expect(items?.[0]).toMatchObject({
      type: 'button',
      label: 'Done',
      variant: 'done',
      selected: true,
    })
    expect(options.unstable_headerLeftItems).toBeUndefined()
  })

  it('passes tintColor through by identity, including dynamic values', () => {
    const dynamic = { light: '#fff', dark: '#000' } as unknown as import('react-native').ColorValue
    const options = appendStackToolbarPropsToOptions(
      {},
      toolbarProps(
        <StackToolbarButton tintColor={dynamic} onPress={() => {}}>
          Edit
        </StackToolbarButton>,
        'left'
      )
    )
    const items = options.unstable_headerLeftItems?.({} as never)
    expect(items).toHaveLength(1)
    const [first] = items as [{ tintColor?: unknown }]
    expect(first).toMatchObject({ tintColor: dynamic })
    expect(first.tintColor).toBe(dynamic)
  })

  it('maps separateBackground to sharesBackground, defaulting to shared', () => {
    const options = appendStackToolbarPropsToOptions(
      {},
      toolbarProps(
        [
          <StackToolbarButton key="a" onPress={() => {}}>
            Shared
          </StackToolbarButton>,
          <StackToolbarButton key="b" separateBackground onPress={() => {}}>
            Split
          </StackToolbarButton>,
        ],
        'left'
      )
    )
    const items = options.unstable_headerLeftItems?.({} as never)
    expect(items?.[0]).toMatchObject({ sharesBackground: true })
    expect(items?.[1]).toMatchObject({ sharesBackground: false })
  })

  it('reads Label, Icon, and Badge children', () => {
    const options = appendStackToolbarPropsToOptions(
      {},
      toolbarProps(
        <StackToolbarButton onPress={() => {}}>
          <StackToolbarIcon sf="bell.fill" />
          <StackToolbarLabel>Alerts</StackToolbarLabel>
          <StackToolbarBadge
            style={{ backgroundColor: 'red', fontSize: 11 } as never}
          >
            3
          </StackToolbarBadge>
        </StackToolbarButton>,
        'right'
      )
    )
    const items = options.unstable_headerRightItems?.({} as never)
    expect(items?.[0]).toMatchObject({
      label: 'Alerts',
      icon: { type: 'sfSymbol', name: 'bell.fill' },
      badge: {
        value: '3',
        style: { backgroundColor: 'red', fontSize: 11 },
      },
    })
  })

  it('maps image-source icons to image header icons with template default from tintColor', () => {
    const source = { uri: 'custom-icon' }
    const options = appendStackToolbarPropsToOptions(
      {},
      toolbarProps(
        <StackToolbarButton icon={source} tintColor="red" onPress={() => {}}>
          Custom
        </StackToolbarButton>,
        'left'
      )
    )
    const items = options.unstable_headerLeftItems?.({} as never)
    expect(items?.[0]).toMatchObject({
      icon: { type: 'image', source, tinted: true },
    })
  })

  it('omits hidden header buttons', () => {
    const options = appendStackToolbarPropsToOptions(
      {},
      toolbarProps(
        <StackToolbarButton hidden onPress={() => {}}>
          Gone
        </StackToolbarButton>,
        'left'
      )
    )
    expect(options.unstable_headerLeftItems?.({} as never)).toEqual([])
  })

  it('maps spacers with width to spacing and drops flexible spacers with a warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const options = appendStackToolbarPropsToOptions(
        {},
        toolbarProps(
          [
            <StackToolbarSpacer key="fixed" width={8} />,
            <StackToolbarSpacer key="flex" />,
          ],
          'right'
        )
      )
      expect(options.unstable_headerRightItems?.({} as never)).toEqual([
        { type: 'spacing', spacing: 8 },
      ])
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('requires `width`'))
    } finally {
      warn.mockRestore()
    }
  })

  it('maps menus to header menu items with actions and submenus', () => {
    const onShare = vi.fn()
    const options = appendStackToolbarPropsToOptions(
      {},
      toolbarProps(
        <StackToolbarMenu title="More" icon="ellipsis.circle">
          <StackToolbarMenuAction icon="square.and.arrow.up" onPress={onShare}>
            Share
          </StackToolbarMenuAction>
          <StackToolbarMenuAction destructive subtitle="gone forever" onPress={() => {}}>
            Delete
          </StackToolbarMenuAction>
          <StackToolbarMenu title="Advanced" inline>
            <StackToolbarMenuAction
              isOn
              unstable_keepPresented
              onPress={() => {}}
            >
              Inspect
            </StackToolbarMenuAction>
          </StackToolbarMenu>
        </StackToolbarMenu>,
        'right'
      )
    )
    const items = options.unstable_headerRightItems?.({} as never)
    expect(items).toHaveLength(1)
    const menu = items?.[0] as {
      type: string
      label: string
      menu: { title: string; multiselectable: boolean; items: unknown[] }
    }
    expect(menu.type).toBe('menu')
    expect(menu.label).toBe('More')
    expect(menu.menu.title).toBe('More')
    expect(menu.menu.multiselectable).toBe(true)
    expect(menu.menu.items).toHaveLength(3)
    const [share, remove, submenu] = menu.menu.items as [
      { type: string; label: string; state: string; onPress: () => void },
      { type: string; destructive?: boolean; description?: string },
      {
        type: string
        label: string
        inline?: boolean
        items: { type: string; state: string; keepsMenuPresented?: boolean }[]
      },
    ]
    expect(share).toMatchObject({ type: 'action', label: 'Share', state: 'off' })
    share.onPress()
    expect(onShare).toHaveBeenCalledOnce()
    expect(remove).toMatchObject({
      type: 'action',
      destructive: true,
      description: 'gone forever',
    })
    expect(submenu).toMatchObject({ type: 'submenu', label: 'Advanced', inline: true })
    expect(submenu.items[0]).toMatchObject({
      type: 'action',
      state: 'on',
      keepsMenuPresented: true,
    })
  })

  it('renders asChild toolbars as custom header elements', () => {
    const custom = (
      <StackToolbarButton onPress={() => {}}>Custom</StackToolbarButton>
    )
    const left = appendStackToolbarPropsToOptions({}, { children: custom, placement: 'left', asChild: true })
    expect(left.headerShown).toBe(true)
    expect(typeof left.headerLeft).toBe('function')
    expect(left.unstable_headerLeftItems).toBeUndefined()
    const right = appendStackToolbarPropsToOptions(
      {},
      { children: custom, placement: 'right', asChild: true }
    )
    expect(typeof right.headerRight).toBe('function')
  })

  it('clears one side while the other side preserves incoming items', () => {
    const staleLeft = { type: 'button', label: 'stale-left', onPress: () => {} }
    const staleRight = { type: 'button', label: 'stale-right', onPress: () => {} }
    const incoming = {
      unstable_headerLeftItems: () => [staleLeft],
      unstable_headerRightItems: () => [staleRight],
    }
    // explicit toolbar wins on its own side only.
    const cleared = appendStackToolbarPropsToOptions(
      incoming as never,
      toolbarProps(
        <StackToolbarButton hidden onPress={() => {}}>
          Hidden
        </StackToolbarButton>,
        'left'
      )
    )
    expect(cleared.unstable_headerLeftItems?.({} as never)).toEqual([])
    expect(cleared.unstable_headerRightItems?.({} as never)).toEqual([staleRight])
  })

  it('drives visible-to-hidden through actual setOptions transitions', () => {
    const calls: unknown[][] = []
    const navigation = { setOptions: (...args: unknown[]) => void calls.push(args) }

    navigation.setOptions(
      appendStackToolbarPropsToOptions(
        {},
        toolbarProps(
          <StackToolbarButton icon="magnifyingglass" onPress={() => {}}>
            Probe
          </StackToolbarButton>,
          'right'
        )
      )
    )
    navigation.setOptions(
      appendStackToolbarPropsToOptions(
        {},
        toolbarProps(
          <StackToolbarButton icon="magnifyingglass" hidden onPress={() => {}}>
            Probe
          </StackToolbarButton>,
          'right'
        )
      )
    )

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

  it('warns on bottom toolbars in layout config and leaves options untouched', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const before = { title: 'Kept' }
      const options = appendStackToolbarPropsToOptions(
        before,
        toolbarProps(<StackToolbarButton onPress={() => {}}>Add</StackToolbarButton>)
      )
      expect(options).toMatchObject({ title: 'Kept' })
      expect(options.unstable_headerLeftItems).toBeUndefined()
      expect(options.unstable_headerRightItems).toBeUndefined()
      expect(options.headerShown).toBeUndefined()
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('bottom placement in layout config has no effect')
      )
    } finally {
      warn.mockRestore()
    }
  })

  it('warns on invalid toolbar children and throws on invalid button and menu children', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const FakeView = Object.assign(() => null, { [TOOLBAR_KIND]: 'view' })
      appendStackToolbarPropsToOptions(
        {},
        toolbarProps(React.createElement(FakeView, { key: 'view' }), 'left')
      )
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('only accepts <Stack.Toolbar.Button>')
      )
      expect(() =>
        appendStackToolbarPropsToOptions(
          {},
          toolbarProps(
            <StackToolbarButton onPress={() => {}}>
              <StackToolbarMenu title="Nope">
                <StackToolbarMenuAction onPress={() => {}}>X</StackToolbarMenuAction>
              </StackToolbarMenu>
            </StackToolbarButton>,
            'left'
          )
        )
      ).toThrow('Stack.Toolbar.Button only accepts')
      expect(() =>
        toolbarChildrenToBottomData([
          <StackToolbarMenu key="m" title="More">
            <StackToolbarButton key="b" onPress={() => {}}>
              Nope
            </StackToolbarButton>
          </StackToolbarMenu>,
        ])
      ).toThrow('Stack.Toolbar.Menu only accepts')
    } finally {
      warn.mockRestore()
    }
  })

  it('builds bottom button descriptors with style, background, and handler', () => {
    const onPress = vi.fn()
    const data = toolbarChildrenToBottomData([
      <StackToolbarButton
        key="share"
        icon="square.and.arrow.up"
        variant="prominent"
        tintColor="#ff2d55"
        separateBackground
        selected
        accessibilityHint="hint"
        onPress={onPress}
      >
        Share
      </StackToolbarButton>,
    ])
    expect(data).toHaveLength(1)
    expect(data[0]).toMatchObject({
      kind: 'button',
      title: 'Share',
      systemImageName: 'square.and.arrow.up',
      barButtonItemStyle: 'prominent',
      tintColor: '#ff2d55',
      sharesBackground: false,
      selected: true,
      accessibilityHint: 'hint',
    })
    const button = data[0]
    expect(button.kind).toBe('button')
    if (button.kind === 'button') {
      expect(button.identifier).toMatch(/^stack-toolbar-bottom-/)
      button.handler()
      expect(onPress).toHaveBeenCalledOnce()
    }
  })

  it('maps done variant to the native done style on bottom buttons', () => {
    const data = toolbarChildrenToBottomData([
      <StackToolbarButton key="done" variant="done" onPress={() => {}}>
        Done
      </StackToolbarButton>,
    ])
    expect(data[0]).toMatchObject({ kind: 'button', barButtonItemStyle: 'done' })
  })

  it('builds bottom menu descriptors with actions, submenus, and presentation flags', () => {
    const data = toolbarChildrenToBottomData([
      <StackToolbarMenu
        key="more"
        title="More"
        icon="ellipsis.circle"
        variant="prominent"
        elementSize="medium"
      >
        <StackToolbarMenuAction
          icon="square.and.arrow.up"
          subtitle="send it"
          discoverabilityLabel="Share this entry"
          onPress={() => {}}
        >
          Share
        </StackToolbarMenuAction>
        <StackToolbarMenu title="Advanced" palette>
          <StackToolbarMenuAction isOn unstable_keepPresented onPress={() => {}}>
            Inspect
          </StackToolbarMenuAction>
        </StackToolbarMenu>
      </StackToolbarMenu>,
    ])
    expect(data).toHaveLength(1)
    const menu = data[0]
    expect(menu.kind).toBe('menu')
    if (menu.kind === 'menu') {
      expect(menu).toMatchObject({
        title: 'More',
        label: 'More',
        systemImageName: 'ellipsis.circle',
        barButtonItemStyle: 'prominent',
        sharesBackground: true,
        elementSize: 'medium',
      })
      expect(menu.children).toHaveLength(2)
      expect(menu.children[0]).toMatchObject({
        kind: 'action',
        title: 'Share',
        icon: 'square.and.arrow.up',
        subtitle: 'send it',
        discoverabilityLabel: 'Share this entry',
      })
      expect(menu.children[1]).toMatchObject({
        kind: 'submenu',
        title: 'Advanced',
        palette: true,
      })
      const submenu = menu.children[1]
      if (submenu.kind === 'submenu') {
        expect(submenu.children[0]).toMatchObject({
          kind: 'action',
          isOn: true,
          keepPresented: true,
        })
      }
    }
  })

  it('builds bottom spacer and search slot descriptors', () => {
    const data = toolbarChildrenToBottomData([
      <StackToolbarSpacer key="flex" />,
      <StackToolbarSpacer key="fixed" width={20} />,
      <StackToolbarSpacer key="joined" sharesBackground />,
      <StackToolbarSearchBarSlot key="search" />,
    ])
    expect(data).toHaveLength(4)
    // unset sharesBackground stays unset so the spacer splits the glass.
    expect(data[0]).toMatchObject({ kind: 'spacer' })
    expect(data[0]).not.toHaveProperty('sharesBackground')
    expect(data[1]).toMatchObject({ kind: 'spacer', width: 20 })
    expect(data[1]).not.toHaveProperty('sharesBackground')
    expect(data[2]).toMatchObject({ kind: 'spacer', sharesBackground: true })
    expect(data[3]).toMatchObject({ kind: 'searchBar', sharesBackground: true })
  })

  it('passes badges under bottom placement to badgeConfiguration', () => {
    const data = toolbarChildrenToBottomData([
      <StackToolbarButton key="b" onPress={() => {}}>
        <StackToolbarLabel>Alerts</StackToolbarLabel>
        <StackToolbarBadge
          style={{ backgroundColor: 'red', color: 'white' } as never}
        >
          3
        </StackToolbarBadge>
      </StackToolbarButton>,
    ])
    expect(data[0]).toMatchObject({
      kind: 'button',
      badgeConfiguration: { value: '3', backgroundColor: 'red', color: 'white' },
    })
  })

  it('warns and drops image icons under bottom placement', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const data = toolbarChildrenToBottomData([
        <StackToolbarButton key="img" icon={{ uri: 'custom' }} onPress={() => {}}>
          Custom
        </StackToolbarButton>,
      ])
      expect(data[0]).toMatchObject({ kind: 'button' })
      expect(data[0]).not.toHaveProperty('systemImageName')
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('does not support image icons')
      )
    } finally {
      warn.mockRestore()
    }
  })

  it('keeps bottom identifiers deterministic and unique', () => {
    const children = [
      <StackToolbarButton key="add" icon="plus" onPress={() => {}}>
        Add
      </StackToolbarButton>,
      <StackToolbarMenu key="more" title="More">
        <StackToolbarMenuAction onPress={() => {}}>Mark</StackToolbarMenuAction>
      </StackToolbarMenu>,
    ]
    const first = toolbarChildrenToBottomData(children)
    const second = toolbarChildrenToBottomData(children)
    const collect = (entries: typeof first): string[] =>
      entries.flatMap((entry) =>
        entry.kind === 'menu'
          ? [entry.identifier, ...collect(entry.children)]
          : [entry.identifier]
      )
    expect(collect(first)).toEqual(collect(second))
    expect(new Set(collect(first)).size).toBe(collect(first).length)
    for (const identifier of collect(first)) {
      expect(identifier).toMatch(/^stack-toolbar-bottom/)
    }
  })

  it('preserves existing options', () => {
    const options = appendStackToolbarPropsToOptions(
      { animation: 'slide_from_right' },
      toolbarProps(undefined, 'left')
    )
    expect(options).toMatchObject({ animation: 'slide_from_right' })
  })
})
