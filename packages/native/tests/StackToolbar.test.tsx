import React from 'react'
import { Platform } from 'react-native'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ setOptions() {} }),
}))

import {
  StackToolbar,
  appendStackToolbarPropsToOptions,
} from '../src/stack-toolbar/StackToolbar'

describe('StackToolbar', () => {
  const withIOS = <T,>(run: () => T): T => {
    const originalOS = Platform.OS
    ;(Platform as { OS: string }).OS = 'ios'
    try {
      return run()
    } finally {
      ;(Platform as { OS: string }).OS = originalOS
    }
  }

  it('converts buttons, symbols, badges, and background props to native header items', () =>
    withIOS(() => {
      const onPress = () => {}
      const result = appendStackToolbarPropsToOptions(
        { title: 'Inbox' },
        {
          placement: 'right',
          children: (
            <StackToolbar.Button
              onPress={onPress}
              selected
              separateBackground
              hidesSharedBackground
            >
              <StackToolbar.Icon sf="bell" />
              <StackToolbar.Label>Notifications</StackToolbar.Label>
              <StackToolbar.Badge style={{ color: 'white', backgroundColor: 'red' }}>
                5
              </StackToolbar.Badge>
            </StackToolbar.Button>
          ),
        }
      )

      expect(result.title).toBe('Inbox')
      expect(result.headerShown).toBe(true)
      expect(result.unstable_headerRightItems?.({} as never)).toEqual([
        expect.objectContaining({
          type: 'button',
          label: 'Notifications',
          icon: { type: 'sfSymbol', name: 'bell' },
          badge: {
            value: '5',
            style: expect.objectContaining({ color: 'white', backgroundColor: 'red' }),
          },
          selected: true,
          sharesBackground: false,
          hidesSharedBackground: true,
          onPress,
        }),
      ])
    }))

  it('uses original image colors unless tinting is requested', () =>
    withIOS(() => {
      const source = { uri: 'https://example.com/icon.png' }
      const result = appendStackToolbarPropsToOptions(
        {},
        {
          placement: 'right',
          children: [
            <StackToolbar.Button key="original" icon={source} />,
            <StackToolbar.Button key="tinted" icon={source} tintColor="blue" />,
            <StackToolbar.Button key="explicit" tintColor="blue">
              <StackToolbar.Icon src={source} renderingMode="original" />
            </StackToolbar.Button>,
          ],
        }
      )

      expect(result.unstable_headerRightItems?.({} as never)).toMatchObject([
        { icon: { type: 'image', source, tinted: false } },
        { icon: { type: 'image', source, tinted: true } },
        { icon: { type: 'image', source, tinted: false } },
      ])
    }))

  it('converts nested native menus and action state', () =>
    withIOS(() => {
      const archive = () => {}
      const result = appendStackToolbarPropsToOptions(
        {},
        {
          placement: 'left',
          children: (
            <StackToolbar.Menu title="Actions" icon="ellipsis.circle">
              <StackToolbar.MenuAction icon="archivebox" isOn onPress={archive}>
                Archive
              </StackToolbar.MenuAction>
              <StackToolbar.Menu destructive inline title="Move to">
                <StackToolbar.MenuAction destructive>Trash</StackToolbar.MenuAction>
              </StackToolbar.Menu>
            </StackToolbar.Menu>
          ),
        }
      )

      expect(result.unstable_headerLeftItems?.({} as never)?.[0]).toMatchObject({
        type: 'menu',
        icon: { type: 'sfSymbol', name: 'ellipsis.circle' },
        menu: {
          title: 'Actions',
          items: [
            {
              type: 'action',
              label: 'Archive',
              icon: { type: 'sfSymbol', name: 'archivebox' },
              state: 'on',
              onPress: archive,
            },
            {
              type: 'submenu',
              label: 'Move to',
              inline: true,
              destructive: true,
              items: [{ type: 'action', label: 'Trash', destructive: true }],
            },
          ],
        },
      })
    }))

  it('does not install native toolbar options on web', () => {
    const original = { title: 'Web' }
    expect(
      appendStackToolbarPropsToOptions(original, {
        placement: 'right',
        children: <StackToolbar.Button icon="star" />,
      })
    ).toBe(original)
  })
})
