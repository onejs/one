import type { HybridObject } from 'react-native-nitro-modules';
export type AudioRecordingPermission = 'undetermined' | 'granted' | 'denied';
export type AudioPlaybackState = 'idle' | 'loading' | 'playing' | 'paused' | 'ended' | 'failed';
export type AudioRecordingState = 'idle' | 'recording' | 'paused';
export interface AudioPlaybackStatus {
    state: AudioPlaybackState;
    uri?: string;
    positionMs: number;
    durationMs?: number;
    error?: string;
}
export interface AudioRecordingStatus {
    state: AudioRecordingState;
    uri?: string;
    durationMs: number;
}
export interface AudioRecordingResult {
    uri: string;
    durationMs: number;
    size: number;
}
export type AudioInterruptionType = 'began' | 'ended';
export interface AudioInterruptionEvent {
    type: AudioInterruptionType;
    shouldResume: boolean;
}
export interface OneAudio extends HybridObject<{
    ios: 'swift';
}> {
    getRecordingPermissionStatus(): Promise<AudioRecordingPermission>;
    requestRecordingPermission(): Promise<AudioRecordingPermission>;
    play(uri: string): Promise<AudioPlaybackStatus>;
    getPlaybackStatus(): Promise<AudioPlaybackStatus>;
    pause(): Promise<AudioPlaybackStatus>;
    resume(): Promise<AudioPlaybackStatus>;
    seek(positionMs: number): Promise<AudioPlaybackStatus>;
    stop(): Promise<void>;
    startRecording(): Promise<AudioRecordingStatus>;
    getRecordingStatus(): Promise<AudioRecordingStatus>;
    pauseRecording(): Promise<AudioRecordingStatus>;
    resumeRecording(): Promise<AudioRecordingStatus>;
    stopRecording(): Promise<AudioRecordingResult>;
    addInterruptionListener(onEvent: (event: AudioInterruptionEvent) => void): () => void;
}
//# sourceMappingURL=OneAudio.nitro.d.ts.map