import { validateCallback } from '../validateCallback'
import { NitroModules } from 'react-native-nitro-modules'
import { rethrowNativeError } from '../nativeError'
import type {
  AudioPlaybackStatus,
  AudioRecordingPermission,
  AudioRecordingResult,
  AudioRecordingStatus,
  AudioInterruptionEvent,
  AudioNowPlayingInfo,
  AudioRemoteCommandEvent,
  OneAudio,
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

let hybrid: OneAudio | undefined

function native(): OneAudio {
  hybrid ??= NitroModules.createHybridObject<OneAudio>('OneAudio')
  return hybrid
}

export const Audio = Object.freeze({
  getRecordingPermissionStatus: (): Promise<AudioRecordingPermission> =>
    native().getRecordingPermissionStatus().catch(rethrowNativeError),
  requestRecordingPermission: (): Promise<AudioRecordingPermission> =>
    native().requestRecordingPermission().catch(rethrowNativeError),
  play: (uri: string): Promise<AudioPlaybackStatus> =>
    native().play(uri).catch(rethrowNativeError),
  getPlaybackStatus: (): Promise<AudioPlaybackStatus> =>
    native().getPlaybackStatus().catch(rethrowNativeError),
  pause: (): Promise<AudioPlaybackStatus> => native().pause().catch(rethrowNativeError),
  resume: (): Promise<AudioPlaybackStatus> => native().resume().catch(rethrowNativeError),
  seek: (positionMs: number): Promise<AudioPlaybackStatus> =>
    native().seek(positionMs).catch(rethrowNativeError),
  stop: (): Promise<void> => native().stop().catch(rethrowNativeError),
  startRecording: (): Promise<AudioRecordingStatus> =>
    native().startRecording().catch(rethrowNativeError),
  getRecordingStatus: (): Promise<AudioRecordingStatus> =>
    native().getRecordingStatus().catch(rethrowNativeError),
  pauseRecording: (): Promise<AudioRecordingStatus> =>
    native().pauseRecording().catch(rethrowNativeError),
  resumeRecording: (): Promise<AudioRecordingStatus> =>
    native().resumeRecording().catch(rethrowNativeError),
  stopRecording: (): Promise<AudioRecordingResult> =>
    native().stopRecording().catch(rethrowNativeError),
  watchInterruptions: (
    onEvent: (event: AudioInterruptionEvent) => void
  ): (() => void) => {
    validateCallback(onEvent, 'Audio.watchInterruptions: onEvent must be a function')
    return native().addInterruptionListener(onEvent)
  },
  setNowPlayingInfo: (info: AudioNowPlayingInfo): Promise<void> =>
    native().setNowPlayingInfo(info).catch(rethrowNativeError),
  clearNowPlayingInfo: (): Promise<void> =>
    native().clearNowPlayingInfo().catch(rethrowNativeError),
  watchRemoteCommands: (
    onEvent: (event: AudioRemoteCommandEvent) => void
  ): (() => void) => {
    validateCallback(onEvent, 'Audio.watchRemoteCommands: onEvent must be a function')
    return native().addRemoteCommandListener(onEvent)
  },
})
