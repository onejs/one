import { describe, expect, test } from 'vitest'
import {
  assertGetImageOptions,
  assertGetStringOptions,
  assertListener,
  assertSetImage,
  assertSetStringOptions,
  assertSetStringText,
  assertSetUrl,
} from './validate'

describe('clipboard validation', () => {
  test('setString text must be a string', () => {
    expect(() => assertSetStringText('ok')).not.toThrow()
    expect(() => assertSetStringText(4)).toThrow(
      'Clipboard.setString: text must be a string'
    )
  })

  test('string formats accept plainText and html only', () => {
    expect(() =>
      assertSetStringOptions({ inputFormat: 'html' }, 'setString')
    ).not.toThrow()
    expect(() => assertSetStringOptions(undefined, 'setString')).not.toThrow()
    expect(() => assertSetStringOptions({ inputFormat: 'rich' } as never, 'setString')).toThrow(
      `Clipboard.setString: inputFormat must be 'plainText' or 'html'`
    )
    expect(() =>
      assertGetStringOptions({ preferredFormat: 'html' }, 'getString')
    ).not.toThrow()
    expect(() =>
      assertGetStringOptions({ preferredFormat: 'markdown' } as never, 'getString')
    ).toThrow(`Clipboard.getString: preferredFormat must be 'plainText' or 'html'`)
  })

  test('image options need a format and a 0 to 1 quality', () => {
    expect(() => assertGetImageOptions({ format: 'png' })).not.toThrow()
    expect(() =>
      assertGetImageOptions({ format: 'jpeg', jpegQuality: 0.5 })
    ).not.toThrow()
    expect(() => assertGetImageOptions({ format: 'gif' } as never)).toThrow(
      `Clipboard.getImage: format must be 'png' or 'jpeg'`
    )
    expect(() => assertGetImageOptions({ format: 'jpeg', jpegQuality: 2 })).toThrow(
      'Clipboard.getImage: jpegQuality must be a number from 0 to 1'
    )
  })

  test('setImage and setUrl need non-empty strings', () => {
    expect(() => assertSetImage('aGVsbG8=')).not.toThrow()
    expect(() => assertSetImage('')).toThrow(
      'Clipboard.setImage: base64Image must be a non-empty string'
    )
    expect(() => assertSetUrl('https://onestack.dev')).not.toThrow()
    expect(() => assertSetUrl('')).toThrow(
      'Clipboard.setUrl: url must be a non-empty string'
    )
  })

  test('addListener needs a function', () => {
    expect(() => assertListener(() => {})).not.toThrow()
    expect(() => assertListener(undefined)).toThrow(
      'Clipboard.addListener: listener must be a function'
    )
  })
})
