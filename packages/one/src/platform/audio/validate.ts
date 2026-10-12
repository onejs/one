import type { PitchCorrectionQuality } from '../specs/OneAudio.nitro'
import type { AudioPlayerOptions, AudioSource } from './types'

// caller-mistake checks shared by the native and web players: same check and
// message on both platforms, thrown synchronously at the js boundary.

const qualities = new Set<string>(['low', 'medium', 'high'])

export type NormalizedSource = {
  uri?: string
  headers?: Record<string, string>
}

export function normalizeSource(source: AudioSource, owner: string): NormalizedSource {
  if (source === null || source === undefined) return {}
  if (typeof source === 'number') {
    throw new Error(`${owner}: assetId sources are not supported`)
  }
  if (typeof source === 'string') {
    if (source.trim() === '') throw new Error(`${owner}: expected a non-empty audio uri`)
    return { uri: source }
  }
  if (typeof source !== 'object') throw new Error(`${owner}: expected an audio source`)
  const { uri, headers, name } = source
  if (uri !== undefined && (typeof uri !== 'string' || uri.trim() === '')) {
    throw new Error(`${owner}: expected a non-empty audio uri`)
  }
  if (name !== undefined && typeof name !== 'string') {
    throw new Error(`${owner}: expected a string source name`)
  }
  if (headers !== undefined) {
    if (typeof headers !== 'object' || headers === null || Array.isArray(headers)) {
      throw new Error(`${owner}: expected source headers to be an object`)
    }
    for (const value of Object.values(headers)) {
      if (typeof value !== 'string') {
        throw new Error(`${owner}: expected source header values to be strings`)
      }
    }
  }
  return { ...(uri !== undefined && { uri }), ...(headers !== undefined && { headers }) }
}

export function resolveUpdateInterval(options: AudioPlayerOptions | undefined, owner: string): number {
  const interval = options?.updateInterval ?? 500
  if (typeof interval !== 'number' || !Number.isFinite(interval) || interval <= 0) {
    throw new Error(`${owner}: expected updateInterval to be a positive number of milliseconds`)
  }
  return interval
}

export function assertCrossOrigin(
  crossOrigin: AudioPlayerOptions['crossOrigin'],
  owner: string
): void {
  if (
    crossOrigin !== undefined &&
    crossOrigin !== 'anonymous' &&
    crossOrigin !== 'use-credentials'
  ) {
    throw new Error(`${owner}: expected crossOrigin 'anonymous' or 'use-credentials'`)
  }
}

export function assertRate(rate: unknown, owner: string): asserts rate is number {
  if (typeof rate !== 'number' || !Number.isFinite(rate)) {
    throw new Error(`${owner}: expected a finite playback rate`)
  }
}

export function assertPitchQuality(
  quality: unknown,
  owner: string
): asserts quality is PitchCorrectionQuality {
  if (typeof quality !== 'string' || !qualities.has(quality)) {
    throw new Error(`${owner}: expected pitch quality 'low', 'medium' or 'high'`)
  }
}

export function assertVolume(volume: unknown, owner: string): asserts volume is number {
  if (typeof volume !== 'number' || !Number.isFinite(volume) || volume < 0 || volume > 1) {
    throw new Error(`${owner}: expected volume between 0 and 1`)
  }
}

export function assertSeconds(seconds: unknown, owner: string): asserts seconds is number {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds < 0) {
    throw new Error(`${owner}: expected a finite nonnegative seek position in seconds`)
  }
}

export function assertTolerance(
  tolerance: unknown,
  owner: string
): asserts tolerance is number {
  if (typeof tolerance !== 'number' || !Number.isFinite(tolerance) || tolerance < 0) {
    throw new Error(`${owner}: expected a finite nonnegative tolerance in milliseconds`)
  }
}

export function assertFlag(value: unknown, owner: string): asserts value is boolean {
  if (typeof value !== 'boolean') throw new Error(`${owner}: expected a boolean`)
}

export function rateError(owner: string): Error {
  return Object.assign(new Error(`${owner}: playback rate is outside the platform range`), {
    code: 'E_AUDIO_RATE',
  })
}
