import { rethrowNativeError } from '../nativeError'
import type { AudioPlayerStatus, OneAudio, PitchCorrectionQuality } from '../specs/OneAudio.nitro'
import { createPlayerEvents } from './events'
import { audioNative } from './hybrid.native'
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
  resolveUpdateInterval,
} from './validate'

export type * from './types'

function native(): OneAudio {
  return audioNative()
}

function sync<T>(work: () => T): T {
  try {
    return work()
  } catch (error) {
    return rethrowNativeError(error)
  }
}

export class AudioPlayer implements AudioPlayerShape {
  private playerId: string
  private removed = false
  private events: ReturnType<typeof createPlayerEvents>

  // obtain through Audio.createPlayer().
  constructor(id: string, updateIntervalMs: number) {
    this.playerId = id
    this.events = createPlayerEvents(() => this.getStatus(), updateIntervalMs)
  }

  get id(): string {
    return this.playerId
  }

  get currentTime(): number {
    return this.status().currentTime
  }

  get duration(): number {
    return this.status().duration
  }

  get playing(): boolean {
    return this.status().playing
  }

  get paused(): boolean {
    return this.status().paused
  }

  get isLoaded(): boolean {
    return this.status().isLoaded
  }

  get isBuffering(): boolean {
    return this.status().isBuffering
  }

  get isAudioSamplingSupported(): boolean {
    return false
  }

  get loop(): boolean {
    return this.status().loop
  }

  set loop(value: boolean) {
    this.assertUsable('loop')
    assertFlag(value, 'AudioPlayer.loop')
    sync(() => native().setPlayerLoop(this.playerId, value))
  }

  get muted(): boolean {
    return this.status().muted
  }

  set muted(value: boolean) {
    this.assertUsable('muted')
    assertFlag(value, 'AudioPlayer.muted')
    sync(() => native().setPlayerMuted(this.playerId, value))
  }

  get volume(): number {
    return this.status().volume
  }

  set volume(value: number) {
    this.assertUsable('volume')
    assertVolume(value, 'AudioPlayer.volume')
    sync(() => native().setPlayerVolume(this.playerId, value))
  }

  get playbackRate(): number {
    return this.status().playbackRate
  }

  get shouldCorrectPitch(): boolean {
    return this.status().shouldCorrectPitch
  }

  set shouldCorrectPitch(value: boolean) {
    this.assertUsable('shouldCorrectPitch')
    assertFlag(value, 'AudioPlayer.shouldCorrectPitch')
    sync(() => native().setPlayerPitchCorrection(this.playerId, value))
  }

  play(): void {
    this.assertUsable('play')
    sync(() => native().playerPlay(this.playerId))
  }

  pause(): void {
    this.assertUsable('pause')
    sync(() => native().playerPause(this.playerId))
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
    return native()
      .playerSeek(this.playerId, seconds, toleranceMillisBefore, toleranceMillisAfter)
      .catch(rethrowNativeError)
  }

  replace(source: AudioSource): void {
    this.assertUsable('replace')
    const normalized = normalizeSource(source, 'AudioPlayer.replace')
    sync(() => native().playerReplace(this.playerId, normalized.uri, normalized.headers))
  }

  remove(): void {
    if (this.removed) return
    this.removed = true
    this.events.removeAll()
    sync(() => native().removePlayer(this.playerId))
  }

  getStatus(): AudioStatus {
    const status = this.status()
    return {
      currentTime: status.currentTime,
      didJustFinish: status.didJustFinish,
      duration: status.duration,
      error: status.error ?? null,
      id: this.playerId,
      isBuffering: status.isBuffering,
      isLoaded: status.isLoaded,
      loop: status.loop,
      mute: status.muted,
      playbackRate: status.playbackRate,
      playing: status.playing,
      shouldCorrectPitch: status.shouldCorrectPitch,
    }
  }

  setPlaybackRate(rate: number, pitchCorrectionQuality?: PitchCorrectionQuality): void {
    this.assertUsable('setPlaybackRate')
    assertRate(rate, 'AudioPlayer.setPlaybackRate')
    if (pitchCorrectionQuality !== undefined) {
      assertPitchQuality(pitchCorrectionQuality, 'AudioPlayer.setPlaybackRate')
    }
    sync(() => native().setPlayerRate(this.playerId, rate, pitchCorrectionQuality))
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

  private status(): AudioPlayerStatus {
    this.assertUsable('status')
    return sync(() => native().getPlayerStatus(this.playerId))
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
  const id = sync(() => native().createPlayer(normalized.uri, normalized.headers))
  return new AudioPlayer(id, updateIntervalMs)
}
