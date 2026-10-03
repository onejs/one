import { describe, expect, test } from 'bun:test'
import { maxSatisfying, satisfies } from 'semver'
import blockedVersions from './blocked-versions.json'
import {
  resolveBetaVersion,
  resolveCanaryVersion,
  resolvePublishTag,
  resolveStableVersion,
  skipBlockedVersions,
} from './release-version'

describe('resolveStableVersion', () => {
  test('selects the first v2 minor boundary from the v1 source with --major', () => {
    expect(resolveStableVersion('1.27.1', { mode: 'major' })).toBe('2.6.0')
  })

  test('preserves patch, minor and major bump semantics', () => {
    expect(resolveStableVersion('1.27.1', { mode: 'patch' })).toBe('1.27.2')
    expect(resolveStableVersion('1.27.1', { mode: 'minor' })).toBe('1.28.0')
    expect(resolveStableVersion('2.6.0', { mode: 'patch' })).toBe('2.6.1')
    expect(resolveStableVersion('2.6.0', { mode: 'minor' })).toBe('2.7.0')
    expect(resolveStableVersion('7.2.3', { mode: 'major' })).toBe('8.0.0')
  })

  test('promotes v2 prereleases within v2 above the legacy range', () => {
    for (const current of ['2.0.0-beta.168.1', '2.0.0-rc.1', '2.0.0-0.canary.123']) {
      expect(resolveStableVersion(current, { mode: 'major' })).toBe('2.6.0')
      expect(resolveStableVersion(current, { mode: 'minor' })).toBe('2.6.0')
      expect(resolveStableVersion(current, { mode: 'patch' })).toBe('2.5.3')
    }
  })

  test('reuses the complete prepared version without resetting its patch or channel', () => {
    for (const version of ['2.6.0', '2.6.4', '2.0.0-beta.168.1']) {
      for (const mode of ['patch', 'minor', 'major'] as const) {
        expect(resolveStableVersion(version, { mode, skipVersion: true })).toBe(version)
      }
    }
  })

  test('excludes every legacy version from the selected stable caret range', () => {
    const selected = resolveStableVersion('1.27.1', { mode: 'major' })
    const legacyV2 = blockedVersions.one.filter((version) => version.startsWith('2.'))
    expect(maxSatisfying(legacyV2, '^2.0.2')).toBe('2.5.2')
    expect(maxSatisfying(legacyV2, `^${selected}`)).toBeNull()
    expect(maxSatisfying([...legacyV2, selected], `^${selected}`)).toBe(selected)
  })

  test('rejects invalid source versions', () => {
    expect(() => resolveStableVersion('broken', { mode: 'major' })).toThrow(
      'Invalid release version'
    )
  })
})

describe('skipBlockedVersions', () => {
  test('also clears unoccupied holes below legacy releases', () => {
    expect(skipBlockedVersions('2.0.2')).toBe('2.5.3')
    expect(skipBlockedVersions('2.0.0', 'minor')).toBe('2.6.0')
    expect(skipBlockedVersions('2.0.0', 'major')).toBe('2.6.0')
    expect(skipBlockedVersions('2.6.0', 'major')).toBe('2.6.0')
    expect(skipBlockedVersions('3.0.0', 'major')).toBe('3.2.0')
  })
})

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

test('V2 canaries identify their source line even before the beta version bump', () => {
  expect(
    resolveCanaryVersion('1.27.1', {
      rePublish: false,
      baseVersion: '2.0.0',
      now: () => 1787823968463,
    })
  ).toBe('2.0.0-0.canary.1787823968463')
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

test('push canaries cannot replace a beta through its dependency range', () => {
  for (const major of [2, 3]) {
    const canary = resolveCanaryVersion('1.27.1', {
      rePublish: false,
      baseVersion: `${major}.0.0`,
      now: () => 1787823968463,
    })
    const beta = `${major}.0.0-beta.200.1`
    const range = `^${major}.0.0-beta.168.1`
    expect(satisfies(canary, range)).toBe(false)
    expect(maxSatisfying([`${major}.0.0-beta.168.1`, beta, canary], range)).toBe(beta)
  }
})
