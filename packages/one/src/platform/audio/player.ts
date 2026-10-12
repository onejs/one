import type { PitchCorrectionQuality } from '../specs/OneAudio.nitro'
import { createPlayerEvents } from './events'
import type {
  AudioPlayer as AudioPlayerShape,
  AudioPlayerOptions,
  AudioSource,
  AudioStatus,
} from './types'
import {
  assertCrossOrigin,
  assertFlag,
  assertPitchQuality,
  assertRate,
  assertSeconds,
  assertTolerance,
  assertVolume,
  normalizeSource,
  rateError,
  resolveUpdateInterval,
} from './validate'

export type * from './types'

// player instances on web, over one html audio element each. headers and
// pitch quality have no web equivalent: headers are ignored, the quality is
// validated and ignored.

export class AudioPlayer implements AudioPlayerShape {
  private element: HTMLAudioElement
  private playerId: string
  private removed = false
  private events: ReturnType<typeof createPlayerEvents>
  private buffering = false
  private finished = false
  private failure: string | null = null

  // obtain through Audio.createPlayer().
  constructor(element: HTMLAudioElement, id: string, updateIntervalMs: number) {
    this.element = element
    this.playerId = id
    this.events = createPlayerEvents(() => this.getStatus(), updateIntervalMs)
    element.addEventListener('waiting', () => {
      this.buffering = true
    })
    element.addEventListener('playing', () => {
      this.buffering = false
      this.failure = null
    })
    element.addEventListener('canplay', () => {
      this.buffering = false
    })
    element.addEventListener('ended', () => {
      this.finished = true
    })
    element.addEventListener('error', () => {
      this.failure = element.error?.message || 'audio playback failed'
    })
  }

  get id(): string {
    return this.playerId
  }

  get currentTime(): number {
    this.assertUsable('currentTime')
    return this.element.currentTime
  }

  get duration(): number {
    this.assertUsable('duration')
    const duration = this.element.duration
    return Number.isFinite(duration) ? duration : 0
  }

  get playing(): boolean {
    this.assertUsable('playing')
    return !this.element.paused && !this.element.ended
  }

  get paused(): boolean {
    this.assertUsable('paused')
    return this.isLoaded && !this.playing
  }

  get isLoaded(): boolean {
    this.assertUsable('isLoaded')
    return this.element.readyState >= 2
  }

  get isBuffering(): boolean {
    this.assertUsable('isBuffering')
    return this.buffering
  }

  get isAudioSamplingSupported(): boolean {
    return false
  }

  get loop(): boolean {
    this.assertUsable('loop')
    return this.element.loop
  }

  set loop(value: boolean) {
    this.assertUsable('loop')
    assertFlag(value, 'AudioPlayer.loop')
    this.element.loop = value
  }

  get muted(): boolean {
    this.assertUsable('muted')
    return this.element.muted
  }

  set muted(value: boolean) {
    this.assertUsable('muted')
    assertFlag(value, 'AudioPlayer.muted')
    this.element.muted = value
  }

  get volume(): number {
    this.assertUsable('volume')
    return this.element.volume
  }

  set volume(value: number) {
    this.assertUsable('volume')
    assertVolume(value, 'AudioPlayer.volume')
    this.element.volume = value
  }

  get playbackRate(): number {
    this.assertUsable('playbackRate')
    return this.element.playbackRate
  }

  get shouldCorrectPitch(): boolean {
    this.assertUsable('shouldCorrectPitch')
    return this.element.preservesPitch
  }

  set shouldCorrectPitch(value: boolean) {
    this.assertUsable('shouldCorrectPitch')
    assertFlag(value, 'AudioPlayer.shouldCorrectPitch')
    this.element.preservesPitch = value
  }

  play(): void {
    this.assertUsable('play')
    this.finished = false
    const started = this.element.play()
    if (started && typeof started.catch === 'function') {
      started.catch((error: unknown) => {
        this.failure = error instanceof Error ? error.message : 'audio playback failed'
      })
    }
  }

  pause(): void {
    this.assertUsable('pause')
    this.element.pause()
  }

  seekTo(
    seconds: number,
    toleranceMillisBefore?: number,
    toleranceMillisAfter?: number
  ): Promise<void> {
    this.assertUsable('seekTo')
    assertSeconds(seconds, 'AudioPlayer.seekTo')
    if (toleranceMillisBefore !== undefined) {
      assertTolerance(toleranceMillisBefore, 'AudioPlayer.seekTo')
    }
    if (toleranceMillisAfter !== undefined) {
      assertTolerance(toleranceMillisAfter, 'AudioPlayer.seekTo')
    }
    this.finished = false
    this.element.currentTime = seconds
    if (!this.element.seeking) return Promise.resolve()
    return new Promise((resolve) => {
      this.element.addEventListener('seeked', () => resolve(), { once: true })
    })
  }

  replace(source: AudioSource): void {
    this.assertUsable('replace')
    const normalized = normalizeSource(source, 'AudioPlayer.replace')
    this.finished = false
    this.failure = null
    if (normalized.uri === undefined) {
      this.element.removeAttribute('src')
    } else {
      this.element.src = normalized.uri
    }
    this.element.load()
  }

  remove(): void {
    if (this.removed) return
    this.removed = true
    this.events.removeAll()
    this.element.pause()
    this.element.removeAttribute('src')
    this.element.load()
  }

  getStatus(): AudioStatus {
    this.assertUsable('getStatus')
    return {
      currentTime: this.currentTime,
      didJustFinish: this.finished,
      duration: this.duration,
      error: this.failure,
      id: this.playerId,
      isBuffering: this.isBuffering,
      isLoaded: this.isLoaded,
      loop: this.loop,
      mute: this.muted,
      playbackRate: this.playbackRate,
      playing: this.playing,
      shouldCorrectPitch: this.shouldCorrectPitch,
    }
  }

  setPlaybackRate(rate: number, pitchCorrectionQuality?: PitchCorrectionQuality): void {
    this.assertUsable('setPlaybackRate')
    assertRate(rate, 'AudioPlayer.setPlaybackRate')
    if (pitchCorrectionQuality !== undefined) {
      assertPitchQuality(pitchCorrectionQuality, 'AudioPlayer.setPlaybackRate')
    }
    if (rate < 0 || rate > 2) throw rateError('AudioPlayer.setPlaybackRate')
    this.element.playbackRate = rate
  }

  addListener(
    event: 'playbackStatusUpdate',
    listener: (status: AudioStatus) => void
  ): { remove: () => void } {
    this.assertUsable('addListener')
    return this.events.add(event, listener)
  }

  removeAllListeners(): void {
    this.events.removeAll()
  }

  private assertUsable(verb: string): void {
    if (this.removed) throw new Error(`AudioPlayer.${verb}: the player was removed`)
  }
}

export function createPlayer(
  source: AudioSource = null,
  options: AudioPlayerOptions = {}
): AudioPlayer {
  const normalized = normalizeSource(source, 'Audio.createPlayer')
  const updateIntervalMs = resolveUpdateInterval(options, 'Audio.createPlayer')
  assertCrossOrigin(options.crossOrigin, 'Audio.createPlayer')
  const element = new Audio()
  element.preload = 'auto'
  if (options.crossOrigin !== undefined) element.crossOrigin = options.crossOrigin
  if (normalized.uri !== undefined) element.src = normalized.uri
  const id = `player-${AudioPlayerId.next++}`
  return new AudioPlayer(element, id, updateIntervalMs)
}

const AudioPlayerId = { next: 1 }
