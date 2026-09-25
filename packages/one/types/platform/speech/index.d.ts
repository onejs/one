import type { SpeechEvent, SpeechPermissionResponse, SpeechSession, SpeechStartOptions } from './types';
export type * from './types';
export declare const Speech: Readonly<{
    isAvailable: () => boolean;
    getPermissions: () => Promise<SpeechPermissionResponse>;
    requestPermissions: () => Promise<SpeechPermissionResponse>;
    start: (_options: SpeechStartOptions, onEvent: (event: SpeechEvent) => void) => SpeechSession;
}>;
//# sourceMappingURL=index.d.ts.map