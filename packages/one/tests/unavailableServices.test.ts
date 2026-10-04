import { expect, test } from 'vitest'
import { One } from '../src/one'
import { proveUnavailableServices } from '../../../tests/native-features/fixtures/one-unavailable-services'

test('uniform services keep their no-native contract during SSR', async () => {
  const result = await proveUnavailableServices(One)
  expect(result.passed).toBe(true)
  expect(result.checks.length).toBeGreaterThan(60)
})
