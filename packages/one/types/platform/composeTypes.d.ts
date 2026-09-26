import type { ColorValue, StyleProp, ViewProps, ViewStyle } from 'react-native';
import type { ReactNode } from 'react';
import type { ComposeIconName } from './generated/composeIcons';
export type { ComposeIconName } from './generated/composeIcons';
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
export type ComposeAccessibilityRole = 'button' | 'switch' | 'checkbox' | 'radio' | 'header' | 'text' | 'adjustable' | 'alert' | 'progressbar';
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
export interface ComposeFlowRowProps extends ComposeNodeProps {
    horizontalArrangement?: ComposeHorizontalArrangement | Readonly<{
        spacedBy: number;
    }>;
    verticalArrangement?: ComposeVerticalArrangement | Readonly<{
        spacedBy: number;
    }>;
}
export interface ComposeBadgeProps extends ComposeNodeProps {
    containerColor?: ColorValue;
    contentColor?: ColorValue;
}
export type ComposeBadgedBoxProps = ComposeNodeProps;
export type ComposeListItemColors = Readonly<{
    containerColor?: ColorValue;
    contentColor?: ColorValue;
    leadingContentColor?: ColorValue;
    trailingContentColor?: ColorValue;
    supportingContentColor?: ColorValue;
    overlineContentColor?: ColorValue;
}>;
export interface ComposeListItemProps extends ComposeNodeProps {
    colors?: ComposeListItemColors;
    tonalElevation?: number;
    shadowElevation?: number;
}
type ComposeLeafProps = Omit<ComposeNodeProps, 'children'>;
export interface ComposeTextProps extends ComposeLeafProps {
    text: string;
    fontSize?: number;
    fontWeight?: ComposeFontWeight;
    textAlign?: ComposeTextAlign;
    maxLines?: number;
}
export interface ComposeIconProps extends ComposeLeafProps {
    name: ComposeIconName;
    size?: number;
    filled?: boolean;
}
export type ComposeButtonVariant = 'filled' | 'tonal' | 'elevated' | 'outlined' | 'text';
export type ComposeButtonTone = 'default' | 'danger';
export interface ComposeButtonProps extends ComposeLeafProps {
    label: string;
    disabled?: boolean;
    variant?: ComposeButtonVariant;
    tone?: ComposeButtonTone;
    icon?: ComposeIconName;
    iconFilled?: boolean;
    onPress?: () => void;
}
export type ComposeIconButtonColors = Readonly<{
    containerColor?: ColorValue;
    contentColor?: ColorValue;
    disabledContainerColor?: ColorValue;
    disabledContentColor?: ColorValue;
}>;
export interface ComposeIconButtonProps extends ComposeNodeProps {
    children: ReactNode;
    enabled?: boolean;
    colors?: ComposeIconButtonColors;
    onClick?: () => void;
}
export interface ComposeFloatingActionButtonProps extends ComposeNodeProps {
    children: ReactNode;
    containerColor?: ColorValue;
    onClick?: () => void;
}
export interface ComposeExtendedFloatingActionButtonProps extends ComposeFloatingActionButtonProps {
    expanded?: boolean;
}
export type ComposeToggleButtonColors = Readonly<{
    containerColor?: ColorValue;
    contentColor?: ColorValue;
    checkedContainerColor?: ColorValue;
    checkedContentColor?: ColorValue;
    disabledContainerColor?: ColorValue;
    disabledContentColor?: ColorValue;
}>;
export interface ComposeToggleButtonProps extends ComposeNodeProps {
    children: ReactNode;
    checked: boolean;
    enabled?: boolean;
    colors?: ComposeToggleButtonColors;
    onCheckedChange?: (checked: boolean) => void;
    revision?: number;
}
export interface ComposeSwitchProps extends ComposeLeafProps {
    isOn: boolean;
    disabled?: boolean;
    label?: string;
    onIsOnChange: (value: boolean) => void;
    revision?: number;
}
export interface ComposeCheckboxProps extends ComposeLeafProps {
    value: boolean;
    disabled?: boolean;
    onCheckedChange?: (value: boolean) => void;
    revision?: number;
    colors?: Readonly<{
        checkedColor?: ColorValue;
        disabledCheckedColor?: ColorValue;
        uncheckedColor?: ColorValue;
        disabledUncheckedColor?: ColorValue;
        checkmarkColor?: ColorValue;
    }>;
}
export interface ComposeRadioButtonProps extends ComposeLeafProps {
    selected: boolean;
    disabled?: boolean;
    onClick?: () => void;
    colors?: Readonly<{
        selectedColor?: ColorValue;
        unselectedColor?: ColorValue;
        disabledSelectedColor?: ColorValue;
        disabledUnselectedColor?: ColorValue;
    }>;
}
export type ComposeCardColors = Readonly<{
    containerColor?: ColorValue;
    contentColor?: ColorValue;
}>;
export type ComposeCardBorder = Readonly<{
    width?: number;
    color?: ColorValue;
}>;
export interface ComposeCardProps extends ComposeNodeProps {
    colors?: ComposeCardColors;
    elevation?: number;
    border?: ComposeCardBorder;
}
export type ComposeElevatedCardProps = Omit<ComposeCardProps, 'border'>;
export type ComposeOutlinedCardProps = ComposeCardProps;
export interface ComposeDividerProps extends ComposeLeafProps {
    thickness?: number;
    color?: ColorValue;
}
type ComposeChipColors = Readonly<{
    containerColor?: ColorValue;
    labelColor?: ColorValue;
    iconColor?: ColorValue;
    iconContentColor?: ColorValue;
    leadingIconContentColor?: ColorValue;
    trailingIconContentColor?: ColorValue;
    leadingIconColor?: ColorValue;
    trailingIconColor?: ColorValue;
    selectedContainerColor?: ColorValue;
    selectedLabelColor?: ColorValue;
    selectedLeadingIconColor?: ColorValue;
    selectedTrailingIconColor?: ColorValue;
}>;
export type ComposeChipBorder = ComposeCardBorder;
interface ComposeChipProps extends ComposeNodeProps {
    children: ReactNode;
    enabled?: boolean;
    elevation?: number;
    border?: ComposeChipBorder;
    onClick?: () => void;
}
export type ComposeAssistChipColors = Pick<ComposeChipColors, 'containerColor' | 'labelColor' | 'leadingIconContentColor' | 'trailingIconContentColor'>;
export interface ComposeAssistChipProps extends ComposeChipProps {
    colors?: ComposeAssistChipColors;
}
export type ComposeFilterChipColors = Pick<ComposeChipColors, 'containerColor' | 'labelColor' | 'iconColor' | 'selectedContainerColor' | 'selectedLabelColor' | 'selectedLeadingIconColor' | 'selectedTrailingIconColor'>;
export interface ComposeFilterChipProps extends ComposeChipProps {
    selected: boolean;
    colors?: ComposeFilterChipColors;
}
export type ComposeInputChipColors = Pick<ComposeChipColors, 'containerColor' | 'labelColor' | 'leadingIconColor' | 'trailingIconColor' | 'selectedContainerColor' | 'selectedLabelColor' | 'selectedLeadingIconColor' | 'selectedTrailingIconColor'>;
export interface ComposeInputChipProps extends ComposeChipProps {
    selected?: boolean;
    colors?: ComposeInputChipColors;
}
export type ComposeSuggestionChipColors = Pick<ComposeChipColors, 'containerColor' | 'labelColor' | 'iconContentColor'>;
export interface ComposeSuggestionChipProps extends ComposeChipProps {
    colors?: ComposeSuggestionChipColors;
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
//# sourceMappingURL=composeTypes.d.ts.map