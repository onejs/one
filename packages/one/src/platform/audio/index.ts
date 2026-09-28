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

function unavailable(): never {
  throw new Error('Audio requires an iOS native build')
}

export const Audio = Object.freeze({
  getRecordingPermissionStatus: (): Promise<AudioRecordingPermission> => unavailable(),
  requestRecordingPermission: (): Promise<AudioRecordingPermission> => unavailable(),
  play: (_uri: string): Promise<AudioPlaybackStatus> => unavailable(),
  getPlaybackStatus: (): Promise<AudioPlaybackStatus> => unavailable(),
  pause: (): Promise<AudioPlaybackStatus> => unavailable(),
  resume: (): Promise<AudioPlaybackStatus> => unavailable(),
  seek: (_positionMs: number): Promise<AudioPlaybackStatus> => unavailable(),
  stop: (): Promise<void> => unavailable(),
  startRecording: (): Promise<AudioRecordingStatus> => unavailable(),
  getRecordingStatus: (): Promise<AudioRecordingStatus> => unavailable(),
  pauseRecording: (): Promise<AudioRecordingStatus> => unavailable(),
  resumeRecording: (): Promise<AudioRecordingStatus> => unavailable(),
  stopRecording: (): Promise<AudioRecordingResult> => unavailable(),
  watchInterruptions: (_onEvent: (event: AudioInterruptionEvent) => void): (() => void) => unavailable(),
  setNowPlayingInfo: (_info: AudioNowPlayingInfo): Promise<void> => unavailable(),
  clearNowPlayingInfo: (): Promise<void> => unavailable(),
  watchRemoteCommands: (_onEvent: (event: AudioRemoteCommandEvent) => void): (() => void) => unavailable(),
})
