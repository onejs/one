import type { AudioPlaybackStatus, AudioPlayOptions, AudioRecordingPermission, AudioRecordingResult, AudioRecordingStatus, AudioInterruptionEvent, AudioNowPlayingInfo, AudioRemoteCommandEvent } from '../specs/OneAudio.nitro.js';
import { AudioPlayer, createPlayer } from './player.native.js';
export type { AudioPlaybackState, AudioPlaybackStatus, AudioPlayOptions, AudioRecordingPermission, AudioRecordingResult, AudioRecordingState, AudioRecordingStatus, AudioInterruptionEvent, AudioInterruptionType, AudioNowPlayingInfo, AudioRemoteCommandEvent, AudioRemoteCommandType, PitchCorrectionQuality, } from '../specs/OneAudio.nitro.js';
export type * from './types.js';
export declare const Audio: Readonly<{
    getRecordingPermissionStatus: () => Promise<AudioRecordingPermission>;
    requestRecordingPermission: () => Promise<AudioRecordingPermission>;
    play: (uri: string, options?: AudioPlayOptions) => Promise<AudioPlaybackStatus>;
    getPlaybackStatus: () => Promise<AudioPlaybackStatus>;
    pause: () => Promise<AudioPlaybackStatus>;
    resume: () => Promise<AudioPlaybackStatus>;
    seek: (positionMs: number) => Promise<AudioPlaybackStatus>;
    stop: () => Promise<void>;
    startRecording: () => Promise<AudioRecordingStatus>;
    getRecordingStatus: () => Promise<AudioRecordingStatus>;
    pauseRecording: () => Promise<AudioRecordingStatus>;
    resumeRecording: () => Promise<AudioRecordingStatus>;
    stopRecording: () => Promise<AudioRecordingResult>;
    watchInterruptions: (onEvent: (event: AudioInterruptionEvent) => void) => (() => void);
    setNowPlayingInfo: (info: AudioNowPlayingInfo) => Promise<void>;
    clearNowPlayingInfo: () => Promise<void>;
    watchRemoteCommands: (onEvent: (event: AudioRemoteCommandEvent) => void) => (() => void);
    AudioPlayer: typeof AudioPlayer;
    createPlayer: typeof createPlayer;
}>;
//# sourceMappingURL=index.native.d.ts.map