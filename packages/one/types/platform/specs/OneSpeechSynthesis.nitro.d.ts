import type { HybridObject } from 'react-native-nitro-modules';
import type { SpeechSynthesisEvent, SpeechSynthesisVoice } from '../speech-synthesis/types';
export interface SpeechSynthesisUtterance {
    text: string;
    language?: string;
    pitch?: number;
    rate?: number;
    voice?: string;
    volume?: number;
}
export interface OneSpeechSynthesis extends HybridObject<{
    ios: 'swift';
    android: 'kotlin';
}> {
    readonly maxInputLength: number;
    speak(utterance: SpeechSynthesisUtterance, onEvent: (event: SpeechSynthesisEvent) => void): void;
    stop(): Promise<void>;
    pause(): Promise<void>;
    resume(): Promise<void>;
    isSpeaking(): Promise<boolean>;
    getAvailableVoices(): Promise<SpeechSynthesisVoice[]>;
}
//# sourceMappingURL=OneSpeechSynthesis.nitro.d.ts.map