import type { ColorValue, KeyboardTypeOptions, ReturnKeyTypeOptions, StyleProp, TextStyle, ViewProps, ViewStyle } from 'react-native';
import type { NativeState } from '../../syncNativeState';
export type TextInputSelection = {
    start: number;
    end?: number;
};
export type TextInputRef = {
    focus: () => void;
    blur: () => void;
    clear: () => void;
    isFocused: () => boolean;
    setSelection: (start: number, end?: number) => Promise<void>;
};
export type TextInputProps = Omit<ViewProps, 'style' | 'pointerEvents' | 'children' | 'hitSlop'> & {
    value?: NativeState<string>;
    defaultValue?: string;
    onChangeText?: (text: string) => void;
    placeholder?: string;
    autoFocus?: boolean;
    editable?: boolean;
    readOnly?: boolean;
    multiline?: boolean;
    numberOfLines?: number;
    rows?: number;
    maxLength?: number;
    secureTextEntry?: boolean;
    keyboardType?: KeyboardTypeOptions;
    inputMode?: 'decimal' | 'email' | 'none' | 'numeric' | 'search' | 'tel' | 'text' | 'url';
    autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
    autoCorrect?: boolean;
    autoComplete?: string;
    returnKeyType?: ReturnKeyTypeOptions;
    enterKeyHint?: 'enter' | 'done' | 'go' | 'next' | 'previous' | 'search' | 'send';
    onSubmitEditing?: (text: string) => void;
    onFocus?: () => void;
    onBlur?: () => void;
    onContentSizeChange?: (size: {
        width: number;
        height: number;
    }) => void;
    onSelectionChange?: (selection: {
        start: number;
        end: number;
    }) => void;
    selection?: NativeState<TextInputSelection>;
    selectTextOnFocus?: boolean;
    selectionColor?: ColorValue;
    selectionHandleColor?: ColorValue;
    cursorColor?: ColorValue;
    caretHidden?: boolean;
    placeholderTextColor?: ColorValue;
    textAlign?: 'auto' | 'left' | 'right' | 'center' | 'justify';
    textStyle?: StyleProp<TextStyle>;
    style?: StyleProp<ViewStyle>;
    underlineColorAndroid?: ColorValue;
};
//# sourceMappingURL=textInputTypes.d.ts.map