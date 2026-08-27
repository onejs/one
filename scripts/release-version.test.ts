import { describe, expect, test } from 'bun:test'
import { resolveCanaryVersion } from './release-version'

describe('resolveCanaryVersion', () => {
  test('reuses the prepared canary version while publishing', () => {
    expect(
      resolveCanaryVersion('1.25.8-1787823968463', {
        rePublish: true,
        now: () => 1787824018337,
      })
    ).toBe('1.25.8-1787823968463')
  })

  test('creates one timestamped version while preparing a canary', () => {
    expect(
      resolveCanaryVersion('1.25.8-1787365782951', {
        rePublish: false,
        now: () => 1787823968463,
      })
    ).toBe('1.25.8-1787823968463')
  })
})
