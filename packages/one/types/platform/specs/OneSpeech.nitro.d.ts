import type { HybridObject } from 'react-native-nitro-modules';
import type { SpeechEvent, SpeechPermissionResponse, SpeechStartOptions } from '../speech/types';
export interface OneSpeech extends HybridObject<{
    ios: 'swift';
    android: 'kotlin';
}> {
    isAvailable(): boolean;
    getPermissions(): Promise<SpeechPermissionResponse>;
    requestPermissions(): Promise<SpeechPermissionResponse>;
    start(options: SpeechStartOptions, onEvent: (event: SpeechEvent) => void): void;
    stop(): void;
    abort(): void;
}
//# sourceMappingURL=OneSpeech.nitro.d.ts.map