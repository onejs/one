import type { SpeechSynthesisOptions as SpeakOptions, SpeechSynthesisVoice as OneVoice } from './types';
export type { SpeechSynthesisEvent, SpeechSynthesisEventType, SpeechSynthesisOptions, SpeechSynthesisVoice, SpeechSynthesisVoiceQuality, } from './types';
declare function speak(text: string, options?: SpeakOptions): void;
declare function stop(): Promise<void>;
declare function pause(): Promise<void>;
declare function resume(): Promise<void>;
declare function isSpeaking(): Promise<boolean>;
declare function getAvailableVoices(): Promise<OneVoice[]>;
export declare const SpeechSynthesis: Readonly<{
    readonly maxInputLength: number;
    speak: typeof speak;
    stop: typeof stop;
    pause: typeof pause;
    resume: typeof resume;
    isSpeaking: typeof isSpeaking;
    getAvailableVoices: typeof getAvailableVoices;
}>;
//# sourceMappingURL=index.d.ts.map