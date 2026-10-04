import type { AudioPlaybackStatus, AudioRecordingPermission, AudioRecordingResult, AudioRecordingStatus, AudioInterruptionEvent, AudioNowPlayingInfo, AudioRemoteCommandEvent } from '../specs/OneAudio.nitro';
export type { AudioPlaybackState, AudioPlaybackStatus, AudioRecordingPermission, AudioRecordingResult, AudioRecordingState, AudioRecordingStatus, AudioInterruptionEvent, AudioInterruptionType, AudioNowPlayingInfo, AudioRemoteCommandEvent, AudioRemoteCommandType, } from '../specs/OneAudio.nitro';
export declare const Audio: Readonly<{
    getRecordingPermissionStatus: () => Promise<AudioRecordingPermission>;
    requestRecordingPermission: () => Promise<AudioRecordingPermission>;
    play: (_uri: string) => Promise<AudioPlaybackStatus>;
    getPlaybackStatus: () => Promise<AudioPlaybackStatus>;
    pause: () => Promise<AudioPlaybackStatus>;
    resume: () => Promise<AudioPlaybackStatus>;
    seek: (_positionMs: number) => Promise<AudioPlaybackStatus>;
    stop: () => Promise<void>;
    startRecording: () => Promise<AudioRecordingStatus>;
    getRecordingStatus: () => Promise<AudioRecordingStatus>;
    pauseRecording: () => Promise<AudioRecordingStatus>;
    resumeRecording: () => Promise<AudioRecordingStatus>;
    stopRecording: () => Promise<AudioRecordingResult>;
    watchInterruptions: (_onEvent: (event: AudioInterruptionEvent) => void) => (() => void);
    setNowPlayingInfo: (_info: AudioNowPlayingInfo) => Promise<void>;
    clearNowPlayingInfo: () => Promise<void>;
    watchRemoteCommands: (_onEvent: (event: AudioRemoteCommandEvent) => void) => (() => void);
}>;
//# sourceMappingURL=unavailable.d.ts.map