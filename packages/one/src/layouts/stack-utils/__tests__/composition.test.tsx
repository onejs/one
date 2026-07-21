import { describe, expect, it } from 'vitest'
import React from 'react'
import { Platform } from 'react-native'

import {
  StackHeaderTitle,
  appendStackHeaderTitlePropsToOptions,
} from '../StackHeaderTitle'
import { StackHeaderLeft, appendStackHeaderLeftPropsToOptions } from '../StackHeaderLeft'
import {
  StackHeaderRight,
  appendStackHeaderRightPropsToOptions,
} from '../StackHeaderRight'
import {
  StackHeaderBackButton,
  appendStackHeaderBackButtonPropsToOptions,
} from '../StackHeaderBackButton'
import {
  StackHeaderSearchBar,
  appendStackHeaderSearchBarPropsToOptions,
} from '../StackHeaderSearchBar'
import {
  StackHeaderComponent,
  appendStackHeaderPropsToOptions,
} from '../StackHeaderComponent'
import { appendScreenStackPropsToOptions } from '../StackScreen'
import { StackHeader } from '../index'
import { StackToolbar, appendStackToolbarPropsToOptions } from '../StackToolbar'

describe('Stack Header Composition', () => {
  describe('StackHeaderTitle', () => {
    it('sets title from children', () => {
      const result = appendStackHeaderTitlePropsToOptions({}, { children: 'My Title' })
      expect(result.title).toBe('My Title')
    })

    it('sets headerLargeTitle when large is true', () => {
      const result = appendStackHeaderTitlePropsToOptions({}, { large: true })
      expect(result.headerLargeTitle).toBe(true)
    })

    it('sets headerTitleAlign from style.textAlign', () => {
      const result = appendStackHeaderTitlePropsToOptions(
        {},
        {
          style: { textAlign: 'center' },
        }
      )
      expect(result.headerTitleAlign).toBe('center')
    })

    it('converts numeric fontWeight to string', () => {
      const result = appendStackHeaderTitlePropsToOptions(
        {},
        {
          style: { fontWeight: '700' },
        }
      )
      expect(result.headerTitleStyle).toMatchObject({ fontWeight: '700' })
    })

    it('preserves existing options', () => {
      const result = appendStackHeaderTitlePropsToOptions(
        { animation: 'slide_from_right' },
        { children: 'Title' }
      )
      expect(result.animation).toBe('slide_from_right')
      expect(result.title).toBe('Title')
    })

    it('sets headerTransparent only on iOS when large is true', () => {
      // Store original Platform.OS
      const originalOS = Platform.OS

      // Test on iOS - should set headerTransparent
      ;(Platform as any).OS = 'ios'
      const iosResult = appendStackHeaderTitlePropsToOptions({}, { large: true })
      expect(iosResult.headerTransparent).toBe(true)

      // Test on Android - should NOT set headerTransparent
      ;(Platform as any).OS = 'android'
      const androidResult = appendStackHeaderTitlePropsToOptions({}, { large: true })
      expect(androidResult.headerTransparent).toBeUndefined()

      // Test on web - should NOT set headerTransparent
      ;(Platform as any).OS = 'web'
      const webResult = appendStackHeaderTitlePropsToOptions({}, { large: true })
      expect(webResult.headerTransparent).toBeUndefined()

      // Restore original
      ;(Platform as any).OS = originalOS
    })
  })

  describe('StackHeaderLeft', () => {
    it('does not set headerLeft without asChild', () => {
      const result = appendStackHeaderLeftPropsToOptions(
        {},
        {
          children: <button>Back</button>,
        }
      )
      expect(result.headerLeft).toBeUndefined()
    })

    it('sets headerLeft with asChild', () => {
      const CustomButton = () => <button>Back</button>
      const result = appendStackHeaderLeftPropsToOptions(
        {},
        {
          asChild: true,
          children: <CustomButton />,
        }
      )
      expect(result.headerLeft).toBeDefined()
      expect(typeof result.headerLeft).toBe('function')
    })

    it('sets headerLeft with asChild even without children', () => {
      const result = appendStackHeaderLeftPropsToOptions({}, { asChild: true })
      // headerLeft is set as a function that returns undefined children
      expect(result.headerLeft).toBeDefined()
      expect(typeof result.headerLeft).toBe('function')
    })

    it('preserves existing options when setting headerLeft', () => {
      const result = appendStackHeaderLeftPropsToOptions(
        { title: 'Existing Title', animation: 'slide_from_right' },
        {
          asChild: true,
          children: <button>Back</button>,
        }
      )
      expect(result.title).toBe('Existing Title')
      expect(result.animation).toBe('slide_from_right')
      expect(result.headerLeft).toBeDefined()
    })

    it('headerLeft function returns children when called', () => {
      const BackButton = () => <button>Back</button>
      const result = appendStackHeaderLeftPropsToOptions(
        {},
        {
          asChild: true,
          children: <BackButton />,
        }
      )
      const headerLeftResult = result.headerLeft?.({} as any)
      expect(headerLeftResult).toBeDefined()
    })
  })

  describe('StackHeaderRight', () => {
    it('does not set headerRight without asChild', () => {
      const result = appendStackHeaderRightPropsToOptions(
        {},
        {
          children: <button>Action</button>,
        }
      )
      expect(result.headerRight).toBeUndefined()
    })

    it('sets headerRight with asChild', () => {
      const CustomButton = () => <button>Action</button>
      const result = appendStackHeaderRightPropsToOptions(
        {},
        {
          asChild: true,
          children: <CustomButton />,
        }
      )
      expect(result.headerRight).toBeDefined()
      expect(typeof result.headerRight).toBe('function')
    })

    it('sets headerRight with asChild even without children', () => {
      const result = appendStackHeaderRightPropsToOptions({}, { asChild: true })
      // headerRight is set as a function that returns undefined children
      expect(result.headerRight).toBeDefined()
      expect(typeof result.headerRight).toBe('function')
    })

    it('preserves existing options when setting headerRight', () => {
      const result = appendStackHeaderRightPropsToOptions(
        { title: 'Existing Title', headerLargeTitle: true },
        {
          asChild: true,
          children: <button>Action</button>,
        }
      )
      expect(result.title).toBe('Existing Title')
      expect(result.headerLargeTitle).toBe(true)
      expect(result.headerRight).toBeDefined()
    })

    it('headerRight function returns children when called', () => {
      const ActionButton = () => <button>Action</button>
      const result = appendStackHeaderRightPropsToOptions(
        {},
        {
          asChild: true,
          children: <ActionButton />,
        }
      )
      const headerRightResult = result.headerRight?.({} as any)
      expect(headerRightResult).toBeDefined()
    })
  })

  describe('StackHeaderBackButton', () => {
    it('sets headerBackTitle from children', () => {
      const result = appendStackHeaderBackButtonPropsToOptions(
        {},
        {
          children: 'Go Back',
        }
      )
      expect(result.headerBackTitle).toBe('Go Back')
    })

    it('sets headerBackVisible to false when hidden', () => {
      const result = appendStackHeaderBackButtonPropsToOptions(
        {},
        {
          hidden: true,
        }
      )
      expect(result.headerBackVisible).toBe(false)
    })

    it('sets headerBackButtonMenuEnabled', () => {
      const result = appendStackHeaderBackButtonPropsToOptions(
        {},
        {
          withMenu: true,
        }
      )
      expect(result.headerBackButtonMenuEnabled).toBe(true)
    })

    it('sets headerBackButtonDisplayMode', () => {
      const result = appendStackHeaderBackButtonPropsToOptions(
        {},
        {
          displayMode: 'minimal',
        }
      )
      expect(result.headerBackButtonDisplayMode).toBe('minimal')
    })
  })

  describe('StackHeaderSearchBar', () => {
    it('sets headerSearchBarOptions with placeholder', () => {
      const result = appendStackHeaderSearchBarPropsToOptions(
        {},
        {
          placeholder: 'Search...',
        }
      )
      expect(result.headerSearchBarOptions).toMatchObject({
        placeholder: 'Search...',
      })
    })

    it('sets headerSearchBarOptions with autoCapitalize', () => {
      const result = appendStackHeaderSearchBarPropsToOptions(
        {},
        {
          autoCapitalize: 'none',
        }
      )
      expect(result.headerSearchBarOptions).toMatchObject({
        autoCapitalize: 'none',
      })
    })

    it('sets headerSearchBarOptions with multiple props', () => {
      const result = appendStackHeaderSearchBarPropsToOptions(
        {},
        {
          placeholder: 'Search articles...',
          autoCapitalize: 'words',
          hideWhenScrolling: true,
          obscureBackground: false,
        }
      )
      expect(result.headerSearchBarOptions).toMatchObject({
        placeholder: 'Search articles...',
        autoCapitalize: 'words',
        hideWhenScrolling: true,
        obscureBackground: false,
      })
    })

    it('preserves existing options when setting search bar', () => {
      const result = appendStackHeaderSearchBarPropsToOptions(
        { title: 'Articles', headerLargeTitle: true },
        {
          placeholder: 'Search...',
        }
      )
      expect(result.title).toBe('Articles')
      expect(result.headerLargeTitle).toBe(true)
      expect(result.headerSearchBarOptions).toMatchObject({
        placeholder: 'Search...',
      })
    })

    it('sets headerSearchBarOptions with placement prop', () => {
      const result = appendStackHeaderSearchBarPropsToOptions(
        {},
        {
          placeholder: 'Search...',
          placement: 'stacked',
        }
      )
      expect(result.headerSearchBarOptions).toMatchObject({
        placeholder: 'Search...',
        placement: 'stacked',
      })
    })

    it('sets empty headerSearchBarOptions when no props', () => {
      const result = appendStackHeaderSearchBarPropsToOptions({}, {})
      expect(result.headerSearchBarOptions).toBeDefined()
      expect(result.headerSearchBarOptions).toEqual({})
    })
  })

  describe('StackHeaderComponent', () => {
    it('sets headerShown false when hidden', () => {
      const result = appendStackHeaderPropsToOptions({}, { hidden: true })
      expect(result.headerShown).toBe(false)
    })

    it('sets headerBlurEffect', () => {
      const result = appendStackHeaderPropsToOptions({}, { blurEffect: 'regular' })
      expect(result.headerBlurEffect).toBe('regular')
    })

    it('sets headerShadowVisible false when shadowColor is transparent', () => {
      const result = appendStackHeaderPropsToOptions(
        {},
        {
          style: { shadowColor: 'transparent' },
        }
      )
      expect(result.headerShadowVisible).toBe(false)
    })

    it('sets headerTransparent when backgroundColor is transparent', () => {
      const result = appendStackHeaderPropsToOptions(
        {},
        {
          style: { backgroundColor: 'transparent' },
        }
      )

      expect(result.headerTransparent).toBe(true)
      expect(result.headerStyle).toMatchObject({ backgroundColor: 'transparent' })
    })

    it('sets headerTransparent with SearchBar (user controls via options if needed)', () => {
      const result = appendStackHeaderPropsToOptions(
        {},
        {
          style: { backgroundColor: 'transparent' },
          children: <StackHeaderSearchBar placeholder="Search..." />,
        }
      )

      // headerTransparent is set when backgroundColor is transparent
      // Users can override with options={{ headerTransparent: false }} if no ScrollView
      expect(result.headerTransparent).toBe(true)
      expect(result.headerSearchBarOptions).toMatchObject({ placeholder: 'Search...' })
    })

    it('processes child Title component', () => {
      const result = appendStackHeaderPropsToOptions(
        {},
        {
          children: <StackHeaderTitle large>Test Title</StackHeaderTitle>,
        }
      )
      expect(result.title).toBe('Test Title')
      expect(result.headerLargeTitle).toBe(true)
    })

    it('processes child BackButton component', () => {
      const result = appendStackHeaderPropsToOptions(
        {},
        {
          children: <StackHeaderBackButton hidden>Back</StackHeaderBackButton>,
        }
      )
      expect(result.headerBackTitle).toBe('Back')
      expect(result.headerBackVisible).toBe(false)
    })

    it('processes multiple children', () => {
      const result = appendStackHeaderPropsToOptions(
        {},
        {
          children: [
            <StackHeaderTitle key="title" large>
              My Screen
            </StackHeaderTitle>,
            <StackHeaderBackButton key="back" hidden />,
          ],
        }
      )
      expect(result.title).toBe('My Screen')
      expect(result.headerLargeTitle).toBe(true)
      expect(result.headerBackVisible).toBe(false)
    })

    it('processes child Left component', () => {
      const result = appendStackHeaderPropsToOptions(
        {},
        {
          children: (
            <StackHeaderLeft asChild>
              <button>Back</button>
            </StackHeaderLeft>
          ),
        }
      )
      expect(result.headerLeft).toBeDefined()
      expect(typeof result.headerLeft).toBe('function')
    })

    it('processes child Right component', () => {
      const result = appendStackHeaderPropsToOptions(
        {},
        {
          children: (
            <StackHeaderRight asChild>
              <button>Action</button>
            </StackHeaderRight>
          ),
        }
      )
      expect(result.headerRight).toBeDefined()
      expect(typeof result.headerRight).toBe('function')
    })

    it('processes child SearchBar component', () => {
      const result = appendStackHeaderPropsToOptions(
        {},
        {
          children: <StackHeaderSearchBar placeholder="Search..." />,
        }
      )
      expect(result.headerSearchBarOptions).toMatchObject({
        placeholder: 'Search...',
      })
    })

    it('processes all child components together', () => {
      const result = appendStackHeaderPropsToOptions(
        {},
        {
          children: [
            <StackHeaderTitle key="title" large>
              Articles
            </StackHeaderTitle>,
            <StackHeaderLeft key="left" asChild>
              <button>Back</button>
            </StackHeaderLeft>,
            <StackHeaderRight key="right" asChild>
              <button>More</button>
            </StackHeaderRight>,
            <StackHeaderSearchBar key="search" placeholder="Search articles..." />,
            <StackHeaderBackButton key="back" displayMode="minimal" />,
          ],
        }
      )
      expect(result.title).toBe('Articles')
      expect(result.headerLargeTitle).toBe(true)
      expect(result.headerLeft).toBeDefined()
      expect(result.headerRight).toBeDefined()
      expect(result.headerSearchBarOptions).toMatchObject({
        placeholder: 'Search articles...',
      })
      expect(result.headerBackButtonDisplayMode).toBe('minimal')
    })
  })

  describe('StackScreen composition', () => {
    it('StackHeader is same reference as StackHeaderComponent', () => {
      // This is critical - if they are different, the child type check will fail
      expect(StackHeader).toBe(StackHeaderComponent)
    })

    it('merges options with Header composition', () => {
      const result = appendScreenStackPropsToOptions(
        { animation: 'slide_from_right' },
        {
          options: { gestureEnabled: true },
          children: (
            <StackHeaderComponent blurEffect="regular">
              <StackHeaderTitle large>Composed Title</StackHeaderTitle>
            </StackHeaderComponent>
          ),
        }
      )

      expect(result.animation).toBe('slide_from_right')
      expect(result.gestureEnabled).toBe(true)
      expect(result.headerBlurEffect).toBe('regular')
      expect(result.title).toBe('Composed Title')
      expect(result.headerLargeTitle).toBe(true)
    })

    it('works with StackHeader compound component (as used via Stack.Header)', () => {
      const result = appendScreenStackPropsToOptions(
        {},
        {
          children: (
            <StackHeader>
              <StackHeader.Title large>Large Title Test</StackHeader.Title>
            </StackHeader>
          ),
        }
      )

      expect(result.title).toBe('Large Title Test')
      expect(result.headerLargeTitle).toBe(true)
    })

    it('works with StackHeader compound component with Left child', () => {
      const result = appendScreenStackPropsToOptions(
        {},
        {
          children: (
            <StackHeader>
              <StackHeader.Title large>Articles</StackHeader.Title>
              <StackHeader.Left asChild>
                <button>Back</button>
              </StackHeader.Left>
            </StackHeader>
          ),
        }
      )

      expect(result.title).toBe('Articles')
      expect(result.headerLargeTitle).toBe(true)
      expect(result.headerLeft).toBeDefined()
    })

    it('composition overrides options prop', () => {
      const result = appendScreenStackPropsToOptions(
        {},
        {
          options: { title: 'Options Title' },
          children: (
            <StackHeaderComponent>
              <StackHeaderTitle>Composed Title</StackHeaderTitle>
            </StackHeaderComponent>
          ),
        }
      )

      // Composition should override the options prop title
      expect(result.title).toBe('Composed Title')
    })

    it('works with StackHeader compound component with Right child', () => {
      const result = appendScreenStackPropsToOptions(
        {},
        {
          children: (
            <StackHeader>
              <StackHeader.Title>Settings</StackHeader.Title>
              <StackHeader.Right asChild>
                <button>Save</button>
              </StackHeader.Right>
            </StackHeader>
          ),
        }
      )

      expect(result.title).toBe('Settings')
      expect(result.headerRight).toBeDefined()
    })

    it('works with StackHeader compound component with SearchBar child', () => {
      const result = appendScreenStackPropsToOptions(
        {},
        {
          children: (
            <StackHeader>
              <StackHeader.Title large>Articles</StackHeader.Title>
              <StackHeader.SearchBar placeholder="Search articles..." />
            </StackHeader>
          ),
        }
      )

      expect(result.title).toBe('Articles')
      expect(result.headerLargeTitle).toBe(true)
      expect(result.headerSearchBarOptions).toMatchObject({
        placeholder: 'Search articles...',
      })
    })

    it('works with full compositional setup', () => {
      const result = appendScreenStackPropsToOptions(
        {},
        {
          options: { animation: 'slide_from_right' },
          children: (
            <StackHeader blurEffect="regular">
              <StackHeader.Title large>My App</StackHeader.Title>
              <StackHeader.Left asChild>
                <button>Menu</button>
              </StackHeader.Left>
              <StackHeader.Right asChild>
                <button>Settings</button>
              </StackHeader.Right>
              <StackHeader.BackButton displayMode="minimal" />
              <StackHeader.SearchBar placeholder="Search..." placement="stacked" />
            </StackHeader>
          ),
        }
      )

      expect(result.animation).toBe('slide_from_right')
      expect(result.headerBlurEffect).toBe('regular')
      expect(result.title).toBe('My App')
      expect(result.headerLargeTitle).toBe(true)
      // headerTransparent is only auto-set on iOS, not on web/android (test runs in web mock)
      expect(result.headerTransparent).toBeUndefined()
      expect(result.headerLeft).toBeDefined()
      expect(result.headerRight).toBeDefined()
      expect(result.headerBackButtonDisplayMode).toBe('minimal')
      expect(result.headerSearchBarOptions).toMatchObject({
        placeholder: 'Search...',
        placement: 'stacked',
      })
    })
  })

  describe('StackToolbar', () => {
    const withIOS = <T,>(run: () => T): T => {
      const originalOS = Platform.OS
      ;(Platform as any).OS = 'ios'
      try {
        return run()
      } finally {
        ;(Platform as any).OS = originalOS
      }
    }

    it('converts buttons, SF Symbols, badges, and iOS 26 background props to native header items', () =>
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
        const items = result.unstable_headerRightItems?.({} as any)
        expect(items).toEqual([
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

    it('uses original image colors unless a tint or rendering mode requests a template', () =>
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

        expect(result.unstable_headerRightItems?.({} as any)).toMatchObject([
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

        const items = result.unstable_headerLeftItems?.({} as any)
        expect(items).toHaveLength(1)
        expect(items?.[0]).toMatchObject({
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

    it('merges left and right toolbars declared on Stack.Screen', () =>
      withIOS(() => {
        const result = appendScreenStackPropsToOptions(
          { title: 'Document' },
          {
            children: [
              <StackToolbar key="left" placement="left">
                <StackToolbar.Button icon="sidebar.left" />
              </StackToolbar>,
              <StackToolbar key="right" placement="right">
                <StackToolbar.Button icon="square.and.arrow.up" />
              </StackToolbar>,
            ],
          }
        )

        expect(result.title).toBe('Document')
        expect(result.unstable_headerLeftItems?.({} as any)).toHaveLength(1)
        expect(result.unstable_headerRightItems?.({} as any)).toHaveLength(1)
      }))

    it('uses custom header content with asChild', () =>
      withIOS(() => {
        const custom = <button>Custom</button>
        const result = appendStackToolbarPropsToOptions(
          {},
          { placement: 'right', asChild: true, children: custom }
        )
        expect(result.headerRight?.({} as any)).toBe(custom)
        expect(result.unstable_headerRightItems).toBeUndefined()
      }))

    it('does not install native toolbar options on web', () => {
      const originalOS = Platform.OS
      ;(Platform as any).OS = 'web'
      try {
        const original = { title: 'Web' }
        expect(
          appendStackToolbarPropsToOptions(original, {
            placement: 'right',
            children: <StackToolbar.Button icon="star" />,
          })
        ).toBe(original)
      } finally {
        ;(Platform as any).OS = originalOS
      }
    })
  })
})
