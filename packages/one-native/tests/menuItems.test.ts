import { describe, expect, it } from 'vitest'
import { flattenMenuItems } from '../src/menuItems'

describe('native menu payload', () => {
  it('preserves nested order and keeps leaf options distinct from submenu options', () => {
    const items = flattenMenuItems([
      { type: 'action', id: 'copy', title: 'Copy', keepsMenuPresented: true },
      {
        type: 'submenu',
        id: 'colors',
        title: 'Colors',
        displayAsPalette: true,
        singleSelection: true,
        preferredElementSize: 'large',
        children: [
          { type: 'action', id: 'red', title: 'Red', state: 'mixed', disabled: true },
          { type: 'action', id: 'blue', title: 'Blue', state: 'on' },
        ],
      },
    ])
    expect(items.map(({ id, parentId }) => [id, parentId])).toEqual([
      ['copy', ''],
      ['colors', ''],
      ['red', 'colors'],
      ['blue', 'colors'],
    ])
    expect(items[0]).toMatchObject({ keepsMenuPresented: true, displayAsPalette: false })
    expect(items[1]).toMatchObject({
      singleSelection: true,
      displayAsPalette: true,
      preferredElementSize: 'large',
    })
    expect(items[2]).toMatchObject({ state: 'mixed', disabled: true })
    expect(items[3]).toMatchObject({ state: 'on', disabled: false })
  })

  it('rejects duplicate ids across submenus before callbacks become ambiguous', () => {
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
  })

  it('rejects an empty id rather than confusing it with the root parent', () => {
    expect(() => flattenMenuItems([{ type: 'action', id: '', title: 'Empty' }])).toThrow(
      'unique, nonempty item ids'
    )
  })

  it('resets optional state when a new item definition omits it', () => {
    expect(
      flattenMenuItems([
        { type: 'action', id: 'check', title: 'Check', state: 'on', disabled: true },
      ])[0]
    ).toMatchObject({ state: 'on', disabled: true })
    expect(
      flattenMenuItems([{ type: 'action', id: 'check', title: 'Check' }])[0]
    ).toMatchObject({ state: 'off', disabled: false })
  })
})
