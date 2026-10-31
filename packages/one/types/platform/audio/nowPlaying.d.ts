import type { AudioNowPlayingInfo, AudioRemoteCommandEvent } from '../specs/OneAudio.nitro';
export type NowPlayingOwner = {
    key: string;
    element: HTMLAudioElement;
    play: () => Promise<unknown>;
    pause: () => Promise<unknown>;
    seek: (positionMs: number) => Promise<unknown>;
};
export declare function claimNowPlaying(next: NowPlayingOwner, info: AudioNowPlayingInfo, verb: string, alive: () => boolean): Promise<void>;
export declare function releaseNowPlaying(key: string): void;
export declare function addRemoteListener(onEvent: (event: AudioRemoteCommandEvent) => void): () => void;
//# sourceMappingURL=nowPlaying.d.ts.map