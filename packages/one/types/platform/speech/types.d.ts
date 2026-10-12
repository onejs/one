export type SpeechPermissionStatus = 'granted' | 'denied' | 'undetermined';
export interface SpeechPermissionResponse {
    status: SpeechPermissionStatus;
    granted: boolean;
    canAskAgain: boolean;
    restricted?: boolean;
}
export type SpeechEventType = 'start' | 'transcript' | 'end' | 'error';
export type SpeechErrorCode = 'not-allowed' | 'service-not-allowed' | 'language-not-supported' | 'audio-capture' | 'interrupted' | 'network' | 'busy' | 'unknown';
export interface SpeechEvent {
    type: SpeechEventType;
    transcript: string;
    error?: SpeechErrorCode;
    message?: string;
}
export interface SpeechStartOptions {
    lang?: string;
}
export interface SpeechSession {
    stop(): void;
    abort(): void;
}
//# sourceMappingURL=types.d.ts.map