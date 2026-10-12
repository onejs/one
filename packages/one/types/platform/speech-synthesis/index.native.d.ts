import type { SpeechSynthesisOptions, SpeechSynthesisVoice } from './types';
export type { SpeechSynthesisEvent, SpeechSynthesisEventType, SpeechSynthesisOptions, SpeechSynthesisVoice, SpeechSynthesisVoiceQuality, } from './types';
declare function speak(text: string, options?: SpeechSynthesisOptions): void;
declare function stop(): Promise<void>;
declare function pause(): Promise<void>;
declare function resume(): Promise<void>;
declare function isSpeaking(): Promise<boolean>;
declare function getAvailableVoices(): Promise<SpeechSynthesisVoice[]>;
export declare const SpeechSynthesis: Readonly<{
    maxInputLength: number;
    speak: typeof speak;
    stop: typeof stop;
    pause: typeof pause;
    resume: typeof resume;
    isSpeaking: typeof isSpeaking;
    getAvailableVoices: typeof getAvailableVoices;
}>;
//# sourceMappingURL=index.native.d.ts.map