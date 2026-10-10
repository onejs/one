import type { SpeechEvent, SpeechPermissionResponse, SpeechSession, SpeechStartOptions } from './types';
export type * from './types';
declare function start(options: SpeechStartOptions, onEvent: (event: SpeechEvent) => void): SpeechSession;
export declare const Speech: Readonly<{
    isAvailable: () => boolean;
    getPermissions: () => Promise<SpeechPermissionResponse>;
    requestPermissions: () => Promise<SpeechPermissionResponse>;
    start: typeof start;
}>;
//# sourceMappingURL=index.native.d.ts.map