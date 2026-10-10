import { validateCallback } from '../validateCallback'
import { missingNativeBuild } from '../nativeError'
import type {
  AudioPlaybackStatus,
  AudioRecordingPermission,
  AudioRecordingResult,
  AudioRecordingStatus,
  AudioInterruptionEvent,
  AudioNowPlayingInfo,
  AudioRemoteCommandEvent,
} from '../specs/OneAudio.nitro'

export type {
  AudioPlaybackState,
  AudioPlaybackStatus,
  AudioRecordingPermission,
  AudioRecordingResult,
  AudioRecordingState,
  AudioRecordingStatus,
  AudioInterruptionEvent,
  AudioInterruptionType,
  AudioNowPlayingInfo,
  AudioRemoteCommandEvent,
  AudioRemoteCommandType,
} from '../specs/OneAudio.nitro'

export const Audio = Object.freeze({
  getRecordingPermissionStatus: (): Promise<AudioRecordingPermission> =>
    Promise.resolve('denied'),
  requestRecordingPermission: (): Promise<AudioRecordingPermission> =>
    Promise.resolve('denied'),
  play: (_uri: string): Promise<AudioPlaybackStatus> =>
    Promise.reject(missingNativeBuild('Audio.play')),
  getPlaybackStatus: (): Promise<AudioPlaybackStatus> =>
    Promise.resolve({ state: 'idle', positionMs: 0 }),
  pause: (): Promise<AudioPlaybackStatus> =>
    Promise.resolve({ state: 'idle', positionMs: 0 }),
  resume: (): Promise<AudioPlaybackStatus> =>
    Promise.resolve({ state: 'idle', positionMs: 0 }),
  seek: (_positionMs: number): Promise<AudioPlaybackStatus> =>
    Promise.resolve({ state: 'idle', positionMs: 0 }),
  stop: (): Promise<void> => Promise.resolve(),
  startRecording: (): Promise<AudioRecordingStatus> =>
    Promise.reject(missingNativeBuild('Audio.startRecording')),
  getRecordingStatus: (): Promise<AudioRecordingStatus> =>
    Promise.resolve({ state: 'idle', durationMs: 0 }),
  pauseRecording: (): Promise<AudioRecordingStatus> =>
    Promise.resolve({ state: 'idle', durationMs: 0 }),
  resumeRecording: (): Promise<AudioRecordingStatus> =>
    Promise.resolve({ state: 'idle', durationMs: 0 }),
  stopRecording: (): Promise<AudioRecordingResult> =>
    Promise.reject(missingNativeBuild('Audio.stopRecording')),
  watchInterruptions: (
    onEvent: (event: AudioInterruptionEvent) => void
  ): (() => void) => {
    validateCallback(onEvent, 'Audio.watchInterruptions: onEvent must be a function')
    return () => {}
  },
  setNowPlayingInfo: (_info: AudioNowPlayingInfo): Promise<void> => Promise.resolve(),
  clearNowPlayingInfo: (): Promise<void> => Promise.resolve(),
  watchRemoteCommands: (
    onEvent: (event: AudioRemoteCommandEvent) => void
  ): (() => void) => {
    validateCallback(onEvent, 'Audio.watchRemoteCommands: onEvent must be a function')
    return () => {}
  },
})
