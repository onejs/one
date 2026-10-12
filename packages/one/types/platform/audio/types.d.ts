import type { PitchCorrectionQuality } from '../specs/OneAudio.nitro';
export type AudioSourceObject = {
    uri?: string;
    headers?: Record<string, string>;
    name?: string;
};
export type AudioSource = string | number | AudioSourceObject | null;
export type AudioPlayerOptions = {
    updateInterval?: number;
    crossOrigin?: 'anonymous' | 'use-credentials';
};
export type AudioStatus = {
    currentTime: number;
    didJustFinish: boolean;
    duration: number;
    error: string | null;
    id: string;
    isBuffering: boolean;
    isLoaded: boolean;
    loop: boolean;
    mute: boolean;
    playbackRate: number;
    playing: boolean;
    shouldCorrectPitch?: boolean;
};
export type AudioPlayerSubscription = {
    remove: () => void;
};
export interface AudioPlayer {
    readonly id: string;
    readonly currentTime: number;
    readonly duration: number;
    readonly playing: boolean;
    readonly paused: boolean;
    readonly isLoaded: boolean;
    readonly isBuffering: boolean;
    readonly isAudioSamplingSupported: boolean;
    loop: boolean;
    muted: boolean;
    volume: number;
    readonly playbackRate: number;
    shouldCorrectPitch: boolean;
    play: () => void;
    pause: () => void;
    seekTo: (seconds: number, toleranceMillisBefore?: number, toleranceMillisAfter?: number) => Promise<void>;
    replace: (source: AudioSource) => void;
    remove: () => void;
    getStatus: () => AudioStatus;
    setPlaybackRate: (rate: number, pitchCorrectionQuality?: PitchCorrectionQuality) => void;
    addListener: (event: 'playbackStatusUpdate', listener: (status: AudioStatus) => void) => AudioPlayerSubscription;
    removeAllListeners: () => void;
}
//# sourceMappingURL=types.d.ts.map