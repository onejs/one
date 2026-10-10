import type { AudioPlaybackStatus, AudioRecordingPermission, AudioRecordingResult, AudioRecordingStatus, AudioNowPlayingInfo, AudioRemoteCommandEvent } from '../specs/OneAudio.nitro';
export type * from './unavailable';
declare function getRecordingPermissionStatus(): Promise<AudioRecordingPermission>;
declare function requestRecordingPermission(): Promise<AudioRecordingPermission>;
export declare const Audio: Readonly<{
    getRecordingPermissionStatus: typeof getRecordingPermissionStatus;
    requestRecordingPermission: typeof requestRecordingPermission;
    play: (uri: string) => Promise<AudioPlaybackStatus>;
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
    watchInterruptions: (onEvent: (event: import("./unavailable").AudioInterruptionEvent) => void) => (() => void);
    setNowPlayingInfo: (info: AudioNowPlayingInfo) => Promise<void>;
    clearNowPlayingInfo: () => Promise<void>;
    watchRemoteCommands: (onEvent: (event: AudioRemoteCommandEvent) => void) => (() => void);
}>;
//# sourceMappingURL=index.d.ts.map