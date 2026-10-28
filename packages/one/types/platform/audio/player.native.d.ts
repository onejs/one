import type { AudioNowPlayingInfo, PitchCorrectionQuality } from '../specs/OneAudio.nitro';
import type { AudioPlayer as AudioPlayerShape, AudioPlayerOptions, AudioSource, AudioStatus } from './types';
export type * from './types';
export declare class AudioPlayer implements AudioPlayerShape {
    private playerId;
    private removed;
    private events;
    constructor(id: string, updateIntervalMs: number);
    get id(): string;
    get currentTime(): number;
    get duration(): number;
    get playing(): boolean;
    get paused(): boolean;
    get isLoaded(): boolean;
    get isBuffering(): boolean;
    get isAudioSamplingSupported(): boolean;
    get loop(): boolean;
    set loop(value: boolean);
    get muted(): boolean;
    set muted(value: boolean);
    get volume(): number;
    set volume(value: number);
    get playbackRate(): number;
    get shouldCorrectPitch(): boolean;
    set shouldCorrectPitch(value: boolean);
    play(): void;
    pause(): void;
    seekTo(seconds: number, toleranceMillisBefore?: number, toleranceMillisAfter?: number): Promise<void>;
    replace(source: AudioSource): void;
    setNowPlayingInfo(info: AudioNowPlayingInfo): Promise<void>;
    clearNowPlayingInfo(): Promise<void>;
    remove(): void;
    getStatus(): AudioStatus;
    setPlaybackRate(rate: number, pitchCorrectionQuality?: PitchCorrectionQuality): void;
    addListener(event: 'playbackStatusUpdate', listener: (status: AudioStatus) => void): {
        remove: () => void;
    };
    removeAllListeners(): void;
    private status;
    private assertUsable;
}
export declare function createPlayer(source?: AudioSource, options?: AudioPlayerOptions): AudioPlayer;
//# sourceMappingURL=player.native.d.ts.map