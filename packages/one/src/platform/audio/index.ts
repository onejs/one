import type {
  AudioPlaybackStatus,
  AudioRecordingPermission,
  AudioRecordingResult,
  AudioRecordingStatus,
} from '../specs/OneAudio.nitro'

export type {
  AudioPlaybackState,
  AudioPlaybackStatus,
  AudioRecordingPermission,
  AudioRecordingResult,
  AudioRecordingState,
  AudioRecordingStatus,
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
})
