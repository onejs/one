import type { AudioPlaybackStatus, AudioRecordingPermission, AudioRecordingResult, AudioRecordingStatus, AudioInterruptionEvent } from '../specs/OneAudio.nitro';
export type { AudioPlaybackState, AudioPlaybackStatus, AudioRecordingPermission, AudioRecordingResult, AudioRecordingState, AudioRecordingStatus, AudioInterruptionEvent, AudioInterruptionType, } from '../specs/OneAudio.nitro';
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
}>;
//# sourceMappingURL=index.d.ts.map