import { describe, expect, it } from 'vitest'
import { labeledContentProps } from '../src/platform/labeledContent'

const label = 'Destination'

describe('prop validation', () => {
  it('requires a label, because an unlabeled row has no key to read', () => {
    expect(() =>
      labeledContentProps({ label: '', value: 'Lisbon', hasChildren: false })
    ).toThrow('label must be a non-empty string')
    // @ts-expect-error a javascript caller can send anything
    expect(() =>
      labeledContentProps({ label: 42, value: 'Lisbon', hasChildren: false })
    ).toThrow('label must be a non-empty string')
  })

  it('rejects a value and children at once, and neither of them', () => {
    expect(() =>
      labeledContentProps({ label, value: 'Lisbon', hasChildren: true })
    ).toThrow('takes either a value or children')
    expect(() => labeledContentProps({ label, hasChildren: false })).toThrow(
      'needs a value or children'
    )
  })
})

describe('type safety at the prop boundary', () => {
  it('rejects non-string value and systemImage', () => {
    expect(() =>
      // @ts-expect-error a javascript caller can send anything
      labeledContentProps({ label, value: 410, hasChildren: false })
    ).toThrow('value must be a string')
    expect(() =>
      // @ts-expect-error a javascript caller can send anything
      labeledContentProps({ label, systemImage: 7, hasChildren: false })
    ).toThrow('systemImage must be a string')
  })

  it('accepts an empty value, which is a real row state', () => {
    expect(labeledContentProps({ label, value: '', hasChildren: false })).toEqual({
      label,
      value: '',
      systemImage: '',
    })
  })
})

describe('rendering contract', () => {
  it('passes the props the native row reads, with an empty symbol for no image', () => {
    expect(
      labeledContentProps({
        label,
        value: 'Lisbon, Portugal',
        systemImage: 'airplane',
        hasChildren: false,
      })
    ).toEqual({ label, value: 'Lisbon, Portugal', systemImage: 'airplane' })
  })

  it('sends no value when children carry the content', () => {
    expect(labeledContentProps({ label, hasChildren: true })).toEqual({
      label,
      value: '',
      systemImage: '',
    })
  })
})
