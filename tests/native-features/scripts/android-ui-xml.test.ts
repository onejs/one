import { expect, test } from 'bun:test'
import { androidXmlAttributes } from './android-ui-xml'

test('preserves a single-quoted Android error containing JSON double quotes', () => {
  const attrs = androidXmlAttributes(`text='The development server returned response error code: 404&#10;Body: {"message":"Unable to resolve module ./one/metro-entry"}' resource-id="rn_redbox_stack"`)
  expect(attrs.text).toBe('The development server returned response error code: 404\nBody: {"message":"Unable to resolve module ./one/metro-entry"}')
  expect(attrs['resource-id']).toBe('rn_redbox_stack')
})

test('reads ordinary double-quoted UI state and decodes entities once', () => {
  expect(androidXmlAttributes('text="Prevention hold: idle" content-desc="&amp;quot; &quot; &#x1f600;"')).toEqual({
    text: 'Prevention hold: idle', 'content-desc': '&quot; " 😀',
  })
})

test('preserves invalid numeric entities and ignores incomplete attributes', () => {
  expect(androidXmlAttributes('text="&#x110000; &#55296;" broken="unterminated')).toEqual({ text: '&#x110000; &#55296;' })
})
