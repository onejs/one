import type { HybridObject } from 'react-native-nitro-modules';
export type OneKeyboardEventName = 'keyboardWillShow' | 'keyboardDidShow' | 'keyboardWillHide' | 'keyboardDidHide';
export interface OneKeyboardEvent {
    height: number;
    duration: number;
    timestamp: number;
    target: number;
    type: string;
    appearance: string;
}
export interface OneKeyboardFocus {
    current: number;
    count: number;
}
export interface OneKeyboardFrame {
    x: number;
    y: number;
    width: number;
    height: number;
}
export interface OneKeyboard extends HybridObject<{
    ios: 'swift';
    android: 'kotlin';
}> {
    readonly keyboardBorderRadius: number;
    preload(): void;
    setInputMode(mode: number): void;
    setDefaultMode(): void;
    dismiss(keepFocus: boolean, animated: boolean): void;
    setFocusTo(direction: string): void;
    setTranslucent(translucent: boolean): void;
    viewPositionInWindow(viewTag: number): Promise<OneKeyboardFrame>;
    addKeyboardListener(listener: (name: OneKeyboardEventName, event: OneKeyboardEvent) => void): () => void;
    addFocusListener(listener: (event: OneKeyboardFocus) => void): () => void;
    addLayoutSyncListener(listener: () => void): () => void;
    addWindowResizeListener(listener: (width: number, height: number) => void): () => void;
    addAnimationEndListener(listener: (viewTag: number) => void): () => void;
}
//# sourceMappingURL=OneKeyboard.nitro.d.ts.map