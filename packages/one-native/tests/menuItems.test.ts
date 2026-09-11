import { describe, expect, it } from 'vitest'
import { flattenMenuItems } from '../src/menuItems'
import { assertSwiftUIValue } from '../src/generated/swiftui'

const actionDefaults = {
  systemImage: '',
  role: '',
  disabled: false,
  hidden: false,
  help: '',
  controlGroupStyle: 'automatic',
  values: [],
  menuOrder: '',
  menuActionDismissBehavior: '',
}

describe('native menu payload', () => {
  it('flattens actions, toggles, sections, dividers, and nested submenus', () => {
    const items = flattenMenuItems([
      {
        type: 'action',
        id: 'copy',
        title: 'Copy',
        menuActionDismissBehavior: 'disabled',
      },
      {
        type: 'toggle',
        id: 'checked',
        title: 'Checked',
        values: [true],
      },
      {
        type: 'submenu',
        id: 'more',
        title: 'More',
        menuOrder: 'fixed',
        children: [
          { type: 'action', id: 'nested-a', title: 'Nested A' },
          { type: 'action', id: 'nested-b', title: 'Nested B', role: 'destructive' },
          {
            type: 'submenu',
            id: 'deeper',
            title: 'Deeper',
            children: [{ type: 'action', id: 'deep-1', title: 'Deep 1' }],
          },
        ],
      },
      { type: 'divider', id: 'divider' },
      {
        type: 'section',
        id: 'sources',
        title: 'Sources',
        children: [
          { type: 'toggle', id: 'mixed', title: 'Mixed', values: [true, false] },
        ],
      },
      {
        type: 'controlGroup',
        id: 'palette',
        title: 'Palette',
        controlGroupStyle: 'palette',
        children: [{ type: 'action', id: 'red', title: 'Red' }],
      },
    ])

    expect(items.map(({ id, parentId, type }) => [id, parentId, type])).toEqual([
      ['copy', '', 'action'],
      ['checked', '', 'toggle'],
      ['more', '', 'submenu'],
      ['nested-a', 'more', 'action'],
      ['nested-b', 'more', 'action'],
      ['deeper', 'more', 'submenu'],
      ['deep-1', 'deeper', 'action'],
      ['divider', '', 'divider'],
      ['sources', '', 'section'],
      ['mixed', 'sources', 'toggle'],
      ['palette', '', 'controlGroup'],
      ['red', 'palette', 'action'],
    ])
    expect(items[0]).toEqual({
      ...actionDefaults,
      parentId: '',
      type: 'action',
      id: 'copy',
      title: 'Copy',
      menuActionDismissBehavior: 'disabled',
    })
    expect(items[1]).toMatchObject({ type: 'toggle', values: [true], disabled: false })
    expect(items[2]).toMatchObject({ type: 'submenu', menuOrder: 'fixed' })
    expect(items[4]).toMatchObject({ id: 'nested-b', role: 'destructive' })
    expect(items[7]).toMatchObject({ type: 'divider', id: 'divider', title: '' })
    expect(items[8]).toMatchObject({ type: 'section', title: 'Sources' })
    expect(items[9]).toMatchObject({ type: 'toggle', values: [true, false] })
    expect(items[10]).toMatchObject({
      type: 'controlGroup',
      controlGroupStyle: 'palette',
    })
  })

  it('fills omitted optional fields from defaults', () => {
    expect(
      flattenMenuItems([
        {
          type: 'action',
          id: 'check',
          title: 'Check',
          role: 'destructive',
          disabled: true,
          hidden: true,
          menuActionDismissBehavior: 'disabled',
        },
      ])[0]
    ).toMatchObject({
      role: 'destructive',
      disabled: true,
      hidden: true,
      menuActionDismissBehavior: 'disabled',
    })
    expect(
      flattenMenuItems([{ type: 'action', id: 'check', title: 'Check' }])[0]
    ).toEqual({
      ...actionDefaults,
      parentId: '',
      type: 'action',
      id: 'check',
      title: 'Check',
    })
  })

  it('rejects unknown item types, fields, and enums', () => {
    expect(() =>
      flattenMenuItems([{ type: 'palette', id: 'p', title: 'Palette' } as never])
    ).toThrow('Unknown Swift.Menu item type: palette')
    expect(() =>
      flattenMenuItems([
        { type: 'action', id: 'copy', title: 'Copy', unsupportedOption: true } as never,
      ])
    ).toThrow('Unsupported Swift.Menu action property: unsupportedOption')
    expect(() =>
      flattenMenuItems([
        { type: 'action', id: 'copy', title: 'Copy', role: 'primary' as never },
      ])
    ).toThrow('Unknown SwiftUI ButtonRole: primary')
    expect(() =>
      flattenMenuItems([
        {
          type: 'action',
          id: 'copy',
          title: 'Copy',
          menuActionDismissBehavior: 'sticky' as never,
        },
      ])
    ).toThrow('Unknown SwiftUI MenuActionDismissBehavior: sticky')
  })

  it('rejects empty, duplicate, and missing required fields', () => {
    expect(() => flattenMenuItems([{ type: 'action', id: '', title: 'Empty' }])).toThrow(
      'unique, nonempty item ids'
    )
    expect(() =>
      flattenMenuItems([
        { type: 'action', id: 'copy', title: 'Copy' },
        {
          type: 'submenu',
          id: 'more',
          title: 'More',
          children: [{ type: 'action', id: 'copy', title: 'Copy again' }],
        },
      ])
    ).toThrow('unique, nonempty item ids')
    expect(() =>
      flattenMenuItems([{ type: 'toggle', id: 'checked', title: 'Checked' } as never])
    ).toThrow('Swift.Menu toggle requires values')
    expect(() =>
      flattenMenuItems([{ type: 'toggle', id: 'checked', title: 'Checked', values: [] }])
    ).toThrow('Swift.Menu toggle values must be a nonempty boolean array')
    expect(() =>
      flattenMenuItems([
        { type: 'toggle', id: 'checked', title: 'Checked', values: [1] as never },
      ])
    ).toThrow('Swift.Menu toggle values must be a nonempty boolean array')
    expect(() =>
      flattenMenuItems([{ type: 'section', id: 'group', title: 'Group' } as never])
    ).toThrow('Swift.Menu section requires children')
  })

  it('inherits disabled and hidden through nested submenus and sections', () => {
    const items = flattenMenuItems([
      {
        type: 'submenu',
        id: 'more',
        title: 'More',
        disabled: true,
        hidden: true,
        children: [
          { type: 'action', id: 'leaf', title: 'Leaf' },
          {
            type: 'section',
            id: 'group',
            children: [
              {
                type: 'action',
                id: 'grouped',
                title: 'Grouped',
                disabled: false,
                hidden: false,
              },
            ],
          },
        ],
      },
    ])
    expect(items.find((item) => item.id === 'more')).toMatchObject({
      disabled: true,
      hidden: true,
    })
    expect(items.find((item) => item.id === 'leaf')).toMatchObject({
      parentId: 'more',
      disabled: true,
      hidden: true,
    })
    expect(items.find((item) => item.id === 'group')).toMatchObject({
      parentId: 'more',
      disabled: true,
      hidden: true,
    })
    expect(items.find((item) => item.id === 'grouped')).toMatchObject({
      parentId: 'group',
      disabled: true,
      hidden: true,
    })
  })

  it('keeps mixed toggle sources as a nonempty boolean array', () => {
    expect(
      flattenMenuItems([
        { type: 'toggle', id: 'mixed', title: 'Mixed', values: [true, false] },
      ])[0].values
    ).toEqual([true, false])
    expect(
      flattenMenuItems([
        { type: 'toggle', id: 'checked', title: 'Checked', values: [false] },
      ])[0].values
    ).toEqual([false])
  })

  it('gates ButtonRole.confirm and tabBarMinimizeBehavior by OS via assertSwiftUIValue', () => {
    expect(() =>
      flattenMenuItems([{ type: 'action', id: 'ok', title: 'OK', role: 'confirm' }])
    ).toThrow('ButtonRole.confirm requires iOS 26')
    expect(
      flattenMenuItems(
        [{ type: 'action', id: 'ok', title: 'OK', role: 'confirm' }],
        26
      )[0]
    ).toMatchObject({ role: 'confirm' })

    expect(() => assertSwiftUIValue('ButtonRole', 'confirm', 18)).toThrow(
      'ButtonRole.confirm requires iOS 26'
    )
    expect(() => assertSwiftUIValue('ButtonRole', 'confirm', 26)).not.toThrow()
    expect(() => assertSwiftUIValue('TabBarMinimizeBehavior', 'never', 18)).toThrow(
      'TabBarMinimizeBehavior.never requires iOS 26'
    )
    expect(() => assertSwiftUIValue('TabBarMinimizeBehavior', 'never', 26)).not.toThrow()
    expect(() => assertSwiftUIValue('TabBarMinimizeBehavior', 'always', 26)).toThrow(
      'Unknown SwiftUI TabBarMinimizeBehavior: always'
    )
  })
})
