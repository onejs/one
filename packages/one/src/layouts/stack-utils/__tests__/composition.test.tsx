import { describe, expect, it } from 'vitest'
import React from 'react'

import { StackHeaderTitle, appendStackHeaderTitlePropsToOptions } from '../StackHeaderTitle'
import { StackHeaderLeft, appendStackHeaderLeftPropsToOptions } from '../StackHeaderLeft'
import { StackHeaderRight, appendStackHeaderRightPropsToOptions } from '../StackHeaderRight'
import {
  StackHeaderBackButton,
  appendStackHeaderBackButtonPropsToOptions,
} from '../StackHeaderBackButton'
import {
  StackHeaderSearchBar,
  appendStackHeaderSearchBarPropsToOptions,
} from '../StackHeaderSearchBar'
import { StackHeaderComponent, appendStackHeaderPropsToOptions } from '../StackHeaderComponent'
import { appendScreenStackPropsToOptions } from '../StackScreen'

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
    it('sets headerSearchBarOptions', () => {
      const result = appendStackHeaderSearchBarPropsToOptions(
        {},
        {
          placeholder: 'Search...',
          autoCapitalize: 'none',
        }
      )
      expect(result.headerSearchBarOptions).toMatchObject({
        placeholder: 'Search...',
        autoCapitalize: 'none',
      })
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
  })

  describe('StackScreen composition', () => {
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
  })
})
