import type { HybridObject } from 'react-native-nitro-modules'

export type AudioRecordingPermission = 'undetermined' | 'granted' | 'denied'
export type AudioPlaybackState = 'idle' | 'loading' | 'playing' | 'paused' | 'ended' | 'failed'
export type AudioRecordingState = 'idle' | 'recording' | 'paused'

export interface AudioPlaybackStatus {
  state: AudioPlaybackState
  uri?: string
  positionMs: number
  durationMs?: number
  error?: string
}

// with either field set, play prepares the item and seeks before any sound,
// resolving once it is ready at the position.
export interface AudioPlayOptions {
  // keep paused first to avoid a Swift C++ interop padding mismatch on iOS.
  paused?: boolean
  positionMs?: number
}

export interface AudioRecordingStatus {
  state: AudioRecordingState
  uri?: string
  durationMs: number
}

export interface AudioRecordingResult {
  uri: string
  durationMs: number
  size: number
}

export type AudioInterruptionType = 'began' | 'ended'

export interface AudioInterruptionEvent {
  type: AudioInterruptionType
  shouldResume: boolean
}

export interface AudioNowPlayingInfo {
  title: string
  artist?: string
  albumTitle?: string
  artworkUri?: string
}

export type PitchCorrectionQuality = 'low' | 'medium' | 'high'

export interface AudioPlayerStatus {
  currentTime: number
  duration: number
  playing: boolean
  paused: boolean
  isLoaded: boolean
  isBuffering: boolean
  loop: boolean
  muted: boolean
  volume: number
  playbackRate: number
  shouldCorrectPitch: boolean
  error?: string
  didJustFinish: boolean
}

export type AudioRemoteCommandType = 'play' | 'pause' | 'seek'

export interface AudioRemoteCommandEvent {
  type: AudioRemoteCommandType
  positionMs?: number
  playerId?: string
}

export interface OneAudio extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  getRecordingPermissionStatus(): Promise<AudioRecordingPermission>
  requestRecordingPermission(): Promise<AudioRecordingPermission>
  play(uri: string, options: AudioPlayOptions): Promise<AudioPlaybackStatus>
  getPlaybackStatus(): Promise<AudioPlaybackStatus>
  pause(): Promise<AudioPlaybackStatus>
  resume(): Promise<AudioPlaybackStatus>
  seek(positionMs: number): Promise<AudioPlaybackStatus>
  stop(): Promise<void>
  startRecording(): Promise<AudioRecordingStatus>
  getRecordingStatus(): Promise<AudioRecordingStatus>
  pauseRecording(): Promise<AudioRecordingStatus>
  resumeRecording(): Promise<AudioRecordingStatus>
  stopRecording(): Promise<AudioRecordingResult>
  addInterruptionListener(onEvent: (event: AudioInterruptionEvent) => void): () => void
  setNowPlayingInfo(info: AudioNowPlayingInfo): Promise<void>
  clearNowPlayingInfo(): Promise<void>
  addRemoteCommandListener(onEvent: (event: AudioRemoteCommandEvent) => void): () => void
  createPlayer(sourceUri?: string, headers?: Record<string, string>): string
  playerPlay(playerId: string): void
  playerPause(playerId: string): void
  playerSeek(
    playerId: string,
    seconds: number,
    toleranceBeforeMs?: number,
    toleranceAfterMs?: number
  ): Promise<void>
  playerReplace(playerId: string, sourceUri?: string, headers?: Record<string, string>): void
  removePlayer(playerId: string): void
  setPlayerNowPlayingInfo(playerId: string, info: AudioNowPlayingInfo): Promise<void>
  clearPlayerNowPlayingInfo(playerId: string): Promise<void>
  getPlayerStatus(playerId: string): AudioPlayerStatus
  setPlayerRate(playerId: string, rate: number, pitchQuality?: PitchCorrectionQuality): void
  setPlayerVolume(playerId: string, volume: number): void
  setPlayerMuted(playerId: string, muted: boolean): void
  setPlayerLoop(playerId: string, loop: boolean): void
  setPlayerPitchCorrection(playerId: string, enabled: boolean): void
}
