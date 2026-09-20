import type { ColorValue, StyleProp, ViewProps, ViewStyle } from 'react-native';
import type { ReactNode } from 'react';
import type { NativeState } from './syncNativeState';
export type ComposeStyle = Readonly<{
    backgroundColor?: ColorValue;
    foregroundColor?: ColorValue;
    padding?: number;
    paddingTop?: number;
    paddingRight?: number;
    paddingBottom?: number;
    paddingLeft?: number;
    width?: number;
    height?: number;
    fillMaxWidth?: boolean;
    fillMaxHeight?: boolean;
    cornerRadius?: number;
    opacity?: number;
    borderColor?: ColorValue;
    borderWidth?: number;
}>;
export type ComposeHorizontalAlignment = 'start' | 'centerHorizontally' | 'end';
export type ComposeVerticalAlignment = 'top' | 'centerVertically' | 'bottom';
export type ComposeContentAlignment = 'topStart' | 'topCenter' | 'topEnd' | 'centerStart' | 'center' | 'centerEnd' | 'bottomStart' | 'bottomCenter' | 'bottomEnd' | 'top' | 'bottom' | 'start' | 'end';
export type ComposeVerticalArrangement = 'top' | 'center' | 'bottom' | 'spaceBetween' | 'spaceAround' | 'spaceEvenly';
export type ComposeHorizontalArrangement = 'start' | 'center' | 'end' | 'spaceBetween' | 'spaceAround' | 'spaceEvenly';
export type ComposeTextAlign = 'unspecified' | 'left' | 'right' | 'center' | 'justify' | 'start' | 'end';
export type ComposeFontWeight = 'thin' | 'extraLight' | 'light' | 'normal' | 'medium' | 'semiBold' | 'bold' | 'extraBold' | 'black';
export type ComposeAccessibilityRole = 'button' | 'switch' | 'header' | 'text' | 'adjustable' | 'alert' | 'progressbar';
export interface ComposeNodeProps extends Pick<ViewProps, 'accessibilityLabel' | 'accessibilityState' | 'accessibilityValue' | 'testID'> {
    children?: ReactNode;
    accessibilityRole?: ComposeAccessibilityRole;
    style?: StyleProp<ViewStyle>;
    composeStyle?: ComposeStyle;
}
export interface ComposeColumnProps extends ComposeNodeProps {
    horizontalAlignment?: ComposeHorizontalAlignment;
    verticalArrangement?: ComposeVerticalArrangement;
    spacing?: number;
}
export interface ComposeRowProps extends ComposeNodeProps {
    verticalAlignment?: ComposeVerticalAlignment;
    horizontalArrangement?: ComposeHorizontalArrangement;
    spacing?: number;
}
export interface ComposeBoxProps extends ComposeNodeProps {
    contentAlignment?: ComposeContentAlignment;
}
type ComposeLeafProps = Omit<ComposeNodeProps, 'children'>;
export interface ComposeTextProps extends ComposeLeafProps {
    text: string;
    fontSize?: number;
    fontWeight?: ComposeFontWeight;
    textAlign?: ComposeTextAlign;
    maxLines?: number;
}
export type ComposeButtonVariant = 'filled' | 'outlined' | 'text';
export type ComposeButtonTone = 'default' | 'danger';
export interface ComposeButtonProps extends ComposeLeafProps {
    label: string;
    disabled?: boolean;
    variant?: ComposeButtonVariant;
    tone?: ComposeButtonTone;
    onPress?: () => void;
}
export interface ComposeSwitchProps extends ComposeLeafProps {
    isOn: boolean;
    disabled?: boolean;
    label?: string;
    onIsOnChange: (value: boolean) => void;
    revision?: number;
}
export type ComposeTextFieldVariant = 'filled' | 'outlined';
export type ComposeTextFieldKeyboardType = 'default' | 'number' | 'decimal' | 'email' | 'password' | 'phone' | 'url';
export type ComposeTextFieldImeAction = 'default' | 'none' | 'go' | 'search' | 'send' | 'previous' | 'next' | 'done';
export type ComposeTextFieldCapitalization = 'none' | 'characters' | 'words' | 'sentences';
export interface ComposeTextFieldProps extends ComposeLeafProps {
    text: string | NativeState<string>;
    onTextChange: (value: string) => void;
    revision?: number;
    label?: string;
    placeholder?: string;
    disabled?: boolean;
    variant?: ComposeTextFieldVariant;
    keyboardType?: ComposeTextFieldKeyboardType;
    secureText?: boolean;
    focused?: boolean;
    focusRevision?: number;
    onFocusChange?: (focused: boolean) => void;
    imeAction?: ComposeTextFieldImeAction;
    onSubmit?: () => void;
    maxLength?: number;
    multiline?: boolean;
    capitalization?: ComposeTextFieldCapitalization;
    autoCorrect?: boolean;
    textAlign?: ComposeTextAlign;
}
export interface ComposeSliderProps extends ComposeLeafProps {
    value: number;
    onValueChange: (value: number) => void;
    revision?: number;
    minimumValue?: number;
    maximumValue?: number;
    step?: number;
    disabled?: boolean;
}
export interface ComposeAlertDialogProps extends ComposeLeafProps {
    visible: boolean;
    title?: string;
    message?: string;
    confirmLabel: string;
    dismissLabel?: string;
    onConfirm: () => void;
    onDismiss: () => void;
}
export interface ComposeDialogProps extends ComposeNodeProps {
    visible: boolean;
    onDismiss: () => void;
}
export type ComposeProgressVariant = 'linear' | 'circular';
export interface ComposeProgressIndicatorProps extends ComposeLeafProps {
    variant?: ComposeProgressVariant;
    progress?: number;
}
export {};
//# sourceMappingURL=composeTypes.d.ts.map