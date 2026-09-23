import { expect, test } from 'bun:test'
import { resolveBoundServerUrl } from './setupTest'

test('uses the rebound Vite port when its URL contains terminal colors', () => {
  const output =
    'Port 53000 is in use, trying another one...\n' +
    'Local: http://localhost:\x1b[1m53001\x1b[22m/'

  expect(resolveBoundServerUrl('http://localhost:53000', output)).toBe(
    'http://localhost:53001'
  )
})
