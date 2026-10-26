import type { KeyboardTypeOptions, ReturnKeyTypeOptions } from 'react-native';
import type { SDKKeyboardType, SDKSubmitLabel, SDKTextContentType } from '../../generated/controlTypes';
import type { TextInputProps } from './textInputTypes';
export declare function resolveEditable(editable: boolean | undefined, readOnly: boolean | undefined): boolean;
export declare function inputModeToKeyboardType(inputMode: TextInputProps['inputMode']): KeyboardTypeOptions | undefined;
export declare function enterKeyHintToReturnKeyType(enterKeyHint: TextInputProps['enterKeyHint']): ReturnKeyTypeOptions | undefined;
export declare function autoCompleteToTextContentType(autoComplete: string | undefined): SDKTextContentType | null | undefined;
export declare function iosKeyboardType(value: KeyboardTypeOptions): SDKKeyboardType;
export declare function iosSubmitLabel(value: ReturnKeyTypeOptions): SDKSubmitLabel;
export type AndroidKeyboardType = 'default' | 'number' | 'decimal' | 'email' | 'password' | 'phone' | 'url';
export declare function androidKeyboardType(value: KeyboardTypeOptions): AndroidKeyboardType;
export type AndroidImeAction = 'default' | 'none' | 'go' | 'search' | 'send' | 'previous' | 'next' | 'done';
export declare function androidImeAction(value: ReturnKeyTypeOptions): AndroidImeAction;
export declare function applyMaxLength(text: string, maxLength?: number): string;
export declare function useTextInputFocus({ autoFocus, editable, onFocus, onBlur, }: {
    autoFocus: boolean | undefined;
    editable: boolean;
    onFocus: (() => void) | undefined;
    onBlur: (() => void) | undefined;
}): {
    focused: boolean;
    focusRevision: number;
    focus: () => void;
    blur: () => void;
    isFocused: () => boolean;
    handleFocusChange: (next: boolean) => void;
};
//# sourceMappingURL=textInputShared.d.ts.map