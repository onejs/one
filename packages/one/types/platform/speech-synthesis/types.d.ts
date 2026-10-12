export type SpeechSynthesisVoiceQuality = 'default' | 'enhanced';
export interface SpeechSynthesisVoice {
    identifier: string;
    language: string;
    name: string;
    quality: SpeechSynthesisVoiceQuality;
}
export interface SpeechSynthesisOptions {
    language?: string;
    pitch?: number;
    rate?: number;
    voice?: string;
    volume?: number;
    onStart?: () => void;
    onDone?: () => void;
    onStopped?: () => void;
    onError?: (error: Error) => void;
}
export type SpeechSynthesisEventType = 'start' | 'done' | 'stopped' | 'error';
export interface SpeechSynthesisEvent {
    type: SpeechSynthesisEventType;
    message?: string;
}
//# sourceMappingURL=types.d.ts.map