import type { AudioPlaybackStatus, AudioRecordingPermission, AudioRecordingResult, AudioRecordingStatus } from '../specs/OneAudio.nitro';
export type { AudioPlaybackState, AudioPlaybackStatus, AudioRecordingPermission, AudioRecordingResult, AudioRecordingState, AudioRecordingStatus, } from '../specs/OneAudio.nitro';
export declare const Audio: Readonly<{
    getRecordingPermissionStatus: () => Promise<AudioRecordingPermission>;
    requestRecordingPermission: () => Promise<AudioRecordingPermission>;
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
}>;
//# sourceMappingURL=index.native.d.ts.map