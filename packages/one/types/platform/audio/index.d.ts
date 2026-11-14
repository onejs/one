import type { AudioPlaybackStatus, AudioPlayOptions, AudioRecordingPermission, AudioRecordingResult, AudioRecordingStatus, AudioNowPlayingInfo, AudioRemoteCommandEvent } from '../specs/OneAudio.nitro.js';
import { AudioPlayer, createPlayer } from './player.js';
export type { PitchCorrectionQuality } from '../specs/OneAudio.nitro.js';
export type * from './types.js';
export type * from './unavailable.js';
declare function getRecordingPermissionStatus(): Promise<AudioRecordingPermission>;
declare function requestRecordingPermission(): Promise<AudioRecordingPermission>;
export declare const Audio: Readonly<{
    getRecordingPermissionStatus: typeof getRecordingPermissionStatus;
    requestRecordingPermission: typeof requestRecordingPermission;
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
    watchInterruptions: (onEvent: (event: import("./unavailable.js").AudioInterruptionEvent) => void) => (() => void);
    setNowPlayingInfo: (info: AudioNowPlayingInfo) => Promise<void>;
    clearNowPlayingInfo: () => Promise<void>;
    watchRemoteCommands: (onEvent: (event: AudioRemoteCommandEvent) => void) => (() => void);
    AudioPlayer: typeof AudioPlayer;
    createPlayer: typeof createPlayer;
}>;
//# sourceMappingURL=index.d.ts.map