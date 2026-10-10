import { describe, expect, test } from 'vitest'
import {
  auditUnpackedManifest,
  createResolutionRecorder,
  findForbiddenDependencies,
} from './closure'

describe('packed-artifact closure oracle', () => {
  test('fails on expo packages reachable from the app root', () => {
    expect(findForbiddenDependencies({ expo: '1.0.0', react: '19.0.0' })).toEqual([
      'expo',
    ])
    expect(
      findForbiddenDependencies(['expo-constants', '@expo/config-plugins', 'react'])
    ).toEqual(['@expo/config-plugins', 'expo-constants'])
    expect(findForbiddenDependencies({ react: '19.0.0' })).toEqual([])
    expect(
      auditUnpackedManifest({ dependencies: { 'babel-preset-expo': '1.0.0' } })
    ).toEqual(['babel-preset-expo'])
  })

  test('resolution recorder keeps a positive dynamic import and rejects expo', () => {
    const recorder = createResolutionRecorder()
    recorder.record('one', 'app/index.ts')
    recorder.record('./label', 'app/index.ts')
    expect(recorder.events()).toHaveLength(2)
    expect(() => recorder.record('expo-linking')).toThrow()
    expect(() => recorder.record('@expo/cli')).toThrow()
  })
})
