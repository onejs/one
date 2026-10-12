import { describe, expect, test } from 'vitest'
import {
  assertCategoryActions,
  assertCategoryIdentifier,
  assertCategoryOptions,
} from './types'

describe('notification categories', () => {
  test('identifiers are non-empty without : or -', () => {
    expect(() => assertCategoryIdentifier('reply', 'setCategory')).not.toThrow()
    expect(() => assertCategoryIdentifier('', 'setCategory')).toThrow(
      'Notifications.setCategory: identifier must be a non-empty string'
    )
    expect(() => assertCategoryIdentifier('a:b', 'setCategory')).toThrow(
      `Notifications.setCategory: identifier must not contain ':' or '-'`
    )
    expect(() => assertCategoryIdentifier('a-b', 'deleteCategory')).toThrow(
      `Notifications.deleteCategory: identifier must not contain ':' or '-'`
    )
  })

  test('actions need identifiers and titles', () => {
    expect(() =>
      assertCategoryActions(
        [{ identifier: 'reply', buttonTitle: 'Reply', textInput: { placeholder: 'Say it' } }],
        'setCategory'
      )
    ).not.toThrow()
    expect(() => assertCategoryActions('nope', 'setCategory')).toThrow(
      'Notifications.setCategory: actions must be an array'
    )
    expect(() =>
      assertCategoryActions([{ identifier: '', buttonTitle: 'x' }], 'setCategory')
    ).toThrow('Notifications.setCategory: each action needs a non-empty identifier')
    expect(() =>
      assertCategoryActions([{ identifier: 'x', buttonTitle: '' }], 'setCategory')
    ).toThrow('Notifications.setCategory: each action needs a non-empty buttonTitle')
    expect(() =>
      assertCategoryActions(
        [{ identifier: 'x', buttonTitle: 'y', options: { opensAppToForeground: 'yes' } }],
        'setCategory'
      )
    ).toThrow('Notifications.setCategory: action options.opensAppToForeground must be a boolean')
    expect(() =>
      assertCategoryActions(
        [{ identifier: 'x', buttonTitle: 'y', textInput: { placeholder: '' } }],
        'setCategory'
      )
    ).toThrow('Notifications.setCategory: action textInput needs a non-empty placeholder')
  })

  test('options validate field types', () => {
    expect(() =>
      assertCategoryOptions({ allowInCarPlay: true, intentIdentifiers: ['a'] }, 'setCategory')
    ).not.toThrow()
    expect(() => assertCategoryOptions(undefined, 'setCategory')).not.toThrow()
    expect(() =>
      assertCategoryOptions({ showTitle: 1 } as never, 'setCategory')
    ).toThrow('Notifications.setCategory: options.showTitle must be a boolean')
    expect(() =>
      assertCategoryOptions({ intentIdentifiers: [1] } as never, 'setCategory')
    ).toThrow('Notifications.setCategory: options.intentIdentifiers must be string[]')
  })
})
