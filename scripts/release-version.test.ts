import { describe, expect, test } from 'bun:test'
import {
  resolveBetaVersion,
  resolveCanaryVersion,
  resolvePublishTag,
} from './release-version'

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

describe('resolveBetaVersion', () => {
  test('accepts the automatic V2 beta version format', () => {
    expect(resolveBetaVersion(['--beta', '--version', '2.0.0-beta.247.2'])).toBe(
      '2.0.0-beta.247.2'
    )
  })

  test('requires one explicit beta version', () => {
    expect(() => resolveBetaVersion(['--beta'])).toThrow(
      '--beta requires exactly one --version argument'
    )
    expect(() =>
      resolveBetaVersion([
        '--beta',
        '--version',
        '2.0.0-beta.247.2',
        '--version',
        '2.0.0-beta.248.1',
      ])
    ).toThrow('--beta requires exactly one --version argument')
  })

  test('rejects versions outside the V2 beta channel', () => {
    expect(() => resolveBetaVersion(['--beta', '--version', '2.0.0-beta.247'])).toThrow(
      'Beta versions must match 2.0.0-beta.<run>.<attempt>'
    )
    expect(() => resolveBetaVersion(['--beta', '--version', '2.0.0-rc.1'])).toThrow(
      'Beta versions must match 2.0.0-beta.<run>.<attempt>'
    )
  })
})

describe('resolvePublishTag', () => {
  test('keeps prereleases off latest', () => {
    expect(resolvePublishTag('2.0.0-beta.247.2', { canary: false })).toBe('beta')
    expect(resolvePublishTag('2.0.0-rc.1', { canary: false })).toBe('rc')
    expect(resolvePublishTag('1.26.0-1787823968463', { canary: true })).toBe('canary')
    expect(resolvePublishTag('2.0.0', { canary: false })).toBe('latest')
  })
})
