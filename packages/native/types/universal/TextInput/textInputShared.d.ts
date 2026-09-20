import type { KeyboardTypeOptions, ReturnKeyTypeOptions } from 'react-native';
import type { KeyboardType, TextContentType } from '../../textTypes';
import type { TextInputProps } from './textInputTypes';
export declare function resolveEditable(editable: boolean | undefined, readOnly: boolean | undefined): boolean;
export declare function inputModeToKeyboardType(inputMode: TextInputProps['inputMode']): KeyboardTypeOptions | undefined;
export declare function enterKeyHintToReturnKeyType(enterKeyHint: TextInputProps['enterKeyHint']): ReturnKeyTypeOptions | undefined;
export declare function autoCompleteToTextContentType(autoComplete: string | undefined): TextContentType | undefined;
export declare function iosKeyboardType(value: KeyboardTypeOptions): KeyboardType;
export type IosSubmitLabel = 'done' | 'go' | 'send' | 'join' | 'route' | 'search' | 'return' | 'next' | 'continue';
export declare function iosSubmitLabel(value: ReturnKeyTypeOptions): IosSubmitLabel;
export type AndroidKeyboardType = 'default' | 'number' | 'decimal' | 'email' | 'password' | 'phone' | 'url';
export declare function androidKeyboardType(value: KeyboardTypeOptions): AndroidKeyboardType;
export type AndroidImeAction = 'default' | 'none' | 'go' | 'search' | 'send' | 'previous' | 'next' | 'done';
export declare function androidImeAction(value: ReturnKeyTypeOptions): AndroidImeAction;
export declare function applyMaxLength(text: string, maxLength?: number): string;
//# sourceMappingURL=textInputShared.d.ts.map