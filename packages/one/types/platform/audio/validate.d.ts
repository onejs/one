import type { PitchCorrectionQuality } from '../specs/OneAudio.nitro';
import type { AudioPlayerOptions, AudioSource } from './types';
export type NormalizedSource = {
    uri?: string;
    headers?: Record<string, string>;
};
export declare function normalizeSource(source: AudioSource, owner: string): NormalizedSource;
export declare function resolveUpdateInterval(options: AudioPlayerOptions | undefined, owner: string): number;
export declare function assertCrossOrigin(crossOrigin: AudioPlayerOptions['crossOrigin'], owner: string): void;
export declare function assertRate(rate: unknown, owner: string): asserts rate is number;
export declare function assertPitchQuality(quality: unknown, owner: string): asserts quality is PitchCorrectionQuality;
export declare function assertVolume(volume: unknown, owner: string): asserts volume is number;
export declare function assertSeconds(seconds: unknown, owner: string): asserts seconds is number;
export declare function assertTolerance(tolerance: unknown, owner: string): asserts tolerance is number;
export declare function assertFlag(value: unknown, owner: string): asserts value is boolean;
export declare function rateError(owner: string): Error;
//# sourceMappingURL=validate.d.ts.map