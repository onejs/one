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
    weight?: number;
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
export type ComposeSpacerProps = ComposeLeafProps;
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
export interface ComposeSurfaceProps extends ComposeNodeProps {
    color?: ColorValue;
    contentColor?: ColorValue;
    tonalElevation?: number;
    shadowElevation?: number;
    border?: ComposeCardBorder;
    enabled?: boolean;
    selected?: boolean;
    checked?: boolean;
    onClick?: () => void;
    onCheckedChange?: (checked: boolean) => void;
    revision?: number;
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
export interface ComposeSegmentedButtonRowProps extends ComposeNodeProps {
    children: ReactNode;
}
export type ComposeSegmentedButtonColors = Readonly<{
    activeBorderColor?: ColorValue;
    activeContentColor?: ColorValue;
    inactiveBorderColor?: ColorValue;
    inactiveContentColor?: ColorValue;
    disabledActiveBorderColor?: ColorValue;
    disabledActiveContentColor?: ColorValue;
    disabledInactiveBorderColor?: ColorValue;
    disabledInactiveContentColor?: ColorValue;
    activeContainerColor?: ColorValue;
    inactiveContainerColor?: ColorValue;
    disabledActiveContainerColor?: ColorValue;
    disabledInactiveContainerColor?: ColorValue;
}>;
export interface ComposeSegmentedButtonProps extends ComposeNodeProps {
    children: ReactNode;
    selected?: boolean;
    checked?: boolean;
    enabled?: boolean;
    colors?: ComposeSegmentedButtonColors;
    onClick?: () => void;
    onCheckedChange?: (checked: boolean) => void;
    revision?: number;
}
export type ComposeSwitchColors = Readonly<{
    checkedThumbColor?: ColorValue;
    checkedTrackColor?: ColorValue;
    checkedBorderColor?: ColorValue;
    checkedIconColor?: ColorValue;
    uncheckedThumbColor?: ColorValue;
    uncheckedTrackColor?: ColorValue;
    uncheckedBorderColor?: ColorValue;
    uncheckedIconColor?: ColorValue;
    disabledCheckedThumbColor?: ColorValue;
    disabledCheckedTrackColor?: ColorValue;
    disabledCheckedBorderColor?: ColorValue;
    disabledCheckedIconColor?: ColorValue;
    disabledUncheckedThumbColor?: ColorValue;
    disabledUncheckedTrackColor?: ColorValue;
    disabledUncheckedBorderColor?: ColorValue;
    disabledUncheckedIconColor?: ColorValue;
}>;
export interface ComposeSwitchProps extends ComposeLeafProps {
    isOn: boolean;
    disabled?: boolean;
    label?: string;
    colors?: ComposeSwitchColors;
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
    lowerLimit?: number;
    upperLimit?: number;
    step?: number;
    disabled?: boolean;
    colors?: Readonly<{
        thumbColor?: ColorValue;
        activeTrackColor?: ColorValue;
        inactiveTrackColor?: ColorValue;
        activeTickColor?: ColorValue;
        inactiveTickColor?: ColorValue;
    }>;
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
export type ComposeProgressVariant = 'linear' | 'circular' | 'linearWavy' | 'circularWavy';
export type ComposeProgressStrokeCap = 'round' | 'butt' | 'square';
export type ComposeProgressStopIndicator = Readonly<{
    color?: ColorValue;
    strokeCap?: ComposeProgressStrokeCap;
    stopSize?: number;
}>;
export interface ComposeProgressIndicatorProps extends ComposeLeafProps {
    variant?: ComposeProgressVariant;
    progress?: number | null;
    color?: ColorValue;
    trackColor?: ColorValue;
    strokeCap?: ComposeProgressStrokeCap;
    gapSize?: number;
    strokeWidth?: number;
    drawStopIndicator?: ComposeProgressStopIndicator;
    stopSize?: number;
    amplitude?: number;
    wavelength?: number;
    waveSpeed?: number;
}
export interface ComposeLoadingIndicatorProps extends ComposeLeafProps {
    progress?: number | null;
    color?: ColorValue;
}
export interface ComposeContainedLoadingIndicatorProps extends ComposeLoadingIndicatorProps {
    containerColor?: ColorValue;
}
export declare const composeDatePickerColorKeys: readonly ['containerColor', 'titleContentColor', 'headlineContentColor', 'weekdayContentColor', 'subheadContentColor', 'navigationContentColor', 'yearContentColor', 'disabledYearContentColor', 'currentYearContentColor', 'selectedYearContentColor', 'disabledSelectedYearContentColor', 'selectedYearContainerColor', 'disabledSelectedYearContainerColor', 'dayContentColor', 'disabledDayContentColor', 'selectedDayContentColor', 'disabledSelectedDayContentColor', 'selectedDayContainerColor', 'disabledSelectedDayContainerColor', 'todayContentColor', 'todayDateBorderColor', 'dayInSelectionRangeContentColor', 'dayInSelectionRangeContainerColor', 'dividerColor'];
export declare const composeTimePickerColorKeys: readonly ['containerColor', 'clockDialColor', 'clockDialSelectedContentColor', 'clockDialUnselectedContentColor', 'selectorColor', 'periodSelectorBorderColor', 'periodSelectorSelectedContainerColor', 'periodSelectorUnselectedContainerColor', 'periodSelectorSelectedContentColor', 'periodSelectorUnselectedContentColor', 'timeSelectorSelectedContainerColor', 'timeSelectorUnselectedContainerColor', 'timeSelectorSelectedContentColor', 'timeSelectorUnselectedContentColor'];
export type ComposeDatePickerColors = Readonly<Partial<Record<(typeof composeDatePickerColorKeys)[number], ColorValue>>>;
export type ComposeTimePickerColors = Readonly<Partial<Record<(typeof composeTimePickerColorKeys)[number], ColorValue>>>;
export interface ComposeDatePickerProps extends ComposeLeafProps {
    selection: Date;
    onSelectionChange: (value: Date) => void;
    revision?: number;
    minimumDate?: Date;
    maximumDate?: Date;
    variant?: 'picker' | 'input';
    showModeToggle?: boolean;
    color?: ColorValue;
    colors?: ComposeDatePickerColors;
}
export interface ComposeTimePickerProps extends ComposeLeafProps {
    selection: Date;
    onSelectionChange: (value: Date) => void;
    revision?: number;
    is24Hour?: boolean;
    variant?: 'picker' | 'input';
    color?: ColorValue;
    colors?: ComposeTimePickerColors;
}
type ComposePickerDialogProps = {
    visible: boolean;
    onConfirm: (value: Date) => void;
    onDismiss: () => void;
    confirmLabel?: string;
    dismissLabel?: string;
};
export type ComposeDatePickerDialogProps = Omit<ComposeDatePickerProps, 'onSelectionChange' | 'revision'> & ComposePickerDialogProps;
export type ComposeTimePickerDialogProps = Omit<ComposeTimePickerProps, 'onSelectionChange' | 'revision'> & ComposePickerDialogProps;
//# sourceMappingURL=composeTypes.d.ts.map